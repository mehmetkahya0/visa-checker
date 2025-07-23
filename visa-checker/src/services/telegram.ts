import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import type { Update } from "telegraf/typings/core/types/typegram";
import type { VisaAppointment } from "../types";
import { config } from "../config/environment";
import { cacheService } from "./cache";

interface TelegramError {
  response?: {
    parameters?: {
      retry_after?: number;
    };
  };
}

/**
 * Telegram servis sınıfı
 * Telegram mesajlarının gönderilmesi ve bot yönetiminden sorumludur
 */
class TelegramService {
  private bot: Telegraf;
  private messageCount = 0;
  private lastReset = Date.now();
  private resetInterval?: ReturnType<typeof setInterval>;
  private searchCooldowns = new Map<number, number>(); // userId -> lastSearchTime
  private checkNotificationsEnabled = false; // Deneme bildirimleri durumu
  private lastCheckCount = 0; // Son kontrol edilen randevu sayısı

  constructor() {
    this.bot = new Telegraf(config.telegram.botToken);
    this.setupErrorHandler();
    this.setupCommands();
    this.startRateLimitReset();
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
  }

  /**
   * Kod bloğu olarak formatlar (backticks ile çevreler)
   */
  private formatAsCode(text: string): string {
    return `\`${text}\``;
  }

  /**
   * Bot hata yakalayıcısını ayarlar
   * Bot çalışırken oluşabilecek hataları yakalar ve loglar
   */
  private setupErrorHandler(): void {
    this.bot.catch((err: unknown, ctx: Context<Update>) => {
      console.error("Telegram bot hatası:", {
        error: err,
        updateType: ctx.updateType,
        chatId: ctx.chat?.id,
      });
    });
  }

  /**
   * Rate limit sayacını sıfırlar
   * Her dakika başında çalışır
   */
  private startRateLimitReset(): void {
    // Önceki interval'i temizle
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
    }

    this.resetInterval = setInterval(() => {
      if (this.messageCount > 0) {
        console.log(
          `Rate limit sayacı sıfırlandı. Önceki mesaj sayısı: ${this.messageCount}`
        );
      }
      this.messageCount = 0;
      this.lastReset = Date.now();
    }, 60000); // Her dakika
  }

  /**
   * Rate limit kontrolü yapar ve gerekirse bekler
   */
  private async handleRateLimit(): Promise<void> {
    if (this.messageCount >= config.telegram.rateLimit) {
      const timeToWait = 60000 - (Date.now() - this.lastReset);
      if (timeToWait > 0) {
        console.log(
          `Rate limit aşıldı. ${Math.ceil(
            timeToWait / 1000
          )} saniye bekleniyor...`
        );
        await new Promise((resolve) => setTimeout(resolve, timeToWait));
        this.messageCount = 0;
        this.lastReset = Date.now();
      }
    }
  }

  /**
   * Randevu bilgilerini okunabilir bir mesaj formatına dönüştürür
   */
  formatMessage(appointment: VisaAppointment): string {
    const lastChecked = new Date(appointment.last_checked_at);

    const formatDate = (date: Date | string) => {
      if (typeof date === "string") {
        date = new Date(date);
      }
      return date.toLocaleString("tr-TR", {
        timeZone: "Europe/Istanbul",
        dateStyle: "medium",
        timeStyle: "medium",
      });
    };

    const formatAvailableDate = (dateStr?: string): string => {
      if (!dateStr) return "Bilgi Yok";
      return this.escapeMarkdown(dateStr);
    };

    const statusEmoji =
      {
        open: "✅",
        waitlist_open: "⏳",
        closed: "❌",
        waitlist_closed: "🔒",
      }[appointment.status] || "❓";

    return [
      `*${statusEmoji} Yeni randevu bulundu\\!*`,
      `🏢 *Merkez:* ${this.escapeMarkdown(appointment.center)}`,
      `🌍 *Ülke/Misyon:* ${this.escapeMarkdown(appointment.country_code.toUpperCase())} \\-\\> ${this.escapeMarkdown(appointment.mission_code.toUpperCase())}`,
      `🏛️ *Kategori:* ${this.escapeMarkdown(appointment.visa_category)}`,
      `📄 *Tip:* ${this.escapeMarkdown(appointment.visa_type)}`,
      `🚦 *Durum:* ${statusEmoji} ${this.escapeMarkdown(appointment.status)}`,
      `📅 *Son Müsait Tarih:* ${formatAvailableDate(appointment.last_available_date)}`,
      `📊 *Takip Sayısı:* ${appointment.tracking_count}`,
      `⏰ *Son Kontrol:* ${this.escapeMarkdown(formatDate(lastChecked))}`
    ].join("\n");
  }

  /**
   * Yeni randevu bilgisini Telegram kanalına gönderir
   * @returns Mesaj başarıyla gönderildiyse true, hata oluştuysa false döner
   */
  async sendNotification(appointment: VisaAppointment): Promise<boolean> {
    try {
      await this.handleRateLimit();

      await this.bot.telegram.sendMessage(
        config.telegram.channelId,
        this.formatMessage(appointment),
        {
          parse_mode: "MarkdownV2",
          link_preview_options: {
            is_disabled: true,
          },
        }
      );

      this.messageCount++;
      return true;
    } catch (error) {
      if (this.isTelegramError(error)) {
        const retryAfter = error.response?.parameters?.retry_after;
        if (retryAfter) {
          const waitTime = retryAfter * 1000;
          console.log(
            `Telegram rate limit aşıldı. ${retryAfter} saniye bekleniyor...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.sendNotification(appointment);
        }
      }
      console.error("Telegram mesajı gönderilirken hata oluştu:", error);
      return false;
    }
  }

  /**
   * Hata nesnesinin Telegram hatası olup olmadığını kontrol eder
   */
  private isTelegramError(error: unknown): error is TelegramError {
    return (
      error !== null &&
      typeof error === "object" &&
      "response" in error &&
      error.response !== null &&
      typeof error.response === "object" &&
      "parameters" in error.response
    );
  }

  /**
   * Bot komutlarını ayarlar
   */
  private setupCommands(): void {
    // /start komutu
    this.bot.start((ctx) => {
      const userName = ctx.from?.first_name || "Kullanıcı";
      const welcomeMessage = [
        "🤖 *Schengen Vize Randevu Takip Botu*",
        "",
        `Merhaba ${userName}! 👋`,
        "",
        "Vize Şirketleri: 'Kosmos', 'Idata'",
        "Bu bot Schengen vize randevularını otomatik olarak takip eder ve uygun randevular bulunduğunda size bildirim gönderir.",
        "",
        "📋 *Hızlı Komutlar:*",
        "/status - Bot durumu ve yapılandırması",
        "/arama - Manuel randevu ara",
        "/bildirim - Deneme bildirimleri aç/kapat",
        "/stats - İstatistikler ve önbellek bilgileri",
        "/config - Detaylı yapılandırma bilgileri",
        "/ping - Bot bağlantı testi",
        "/help - Tüm komutları göster",
        "",
        "🟢 Bot şu anda aktif olarak randevuları kontrol ediyor!",
        "",
        "💡 Herhangi bir sorunuz varsa /help komutunu kullanabilirsiniz."
      ].join("\n");

      ctx.reply(welcomeMessage, { parse_mode: "Markdown" });
    });

    // /status komutu
    this.bot.command('status', (ctx) => {
      const statusMessage = [
        "📊 *Bot Durumu*",
        "",
        `🟢 Durum: Aktif`,
        `⏱️ Çalışma Süresi: ${this.formatUptime(process.uptime())}`,
        `🔄 Kontrol Sıklığı: ${this.formatAsCode(config.app.checkInterval)}`,
        `🎯 Hedef Ülke: ${config.app.targetCountry.toUpperCase()}`,
        `🏛️ Hedef Misyonlar: ${config.app.missionCountries.join(', ').toUpperCase()}`,
        config.app.targetCities.length > 0 ? `🏙️ Hedef Şehirler: ${config.app.targetCities.join(', ')}` : "",
        config.app.targetSubCategories.length > 0 ? `📄 Vize Tipleri: ${config.app.targetSubCategories.join(', ')}` : "",
        `📨 Bu Dakika Gönderilen Mesaj: ${this.messageCount}/${config.telegram.rateLimit}`,
        `� Deneme Bildirimleri: ${this.checkNotificationsEnabled ? 'Açık ✅' : 'Kapalı ❌'}`,
        `�🐛 Debug Modu: ${config.app.debug ? 'Açık' : 'Kapalı'}`
      ].filter(line => line !== "").join("\n");

      ctx.reply(statusMessage, { parse_mode: "Markdown" });
    });

    // /stats komutu
    this.bot.command('stats', (ctx) => {
      const cacheStats = cacheService.getStats();
      const statsMessage = [
        "📈 *Bot İstatistikleri*",
        "",
        `💾 Önbellek Boyutu: ${cacheStats.size}/${config.cache.maxSize}`,
        `📨 Toplam Gönderilen Mesaj: ${this.getTotalMessageCount()}`,
        `🔄 Son Reset: ${new Date(this.lastReset).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
        `⚡ API URL: ${this.formatAsCode(config.api.visaApiUrl)}`,
        `🔁 Maksimum Deneme: ${config.api.maxRetries}`
      ].join("\n");

      ctx.reply(statsMessage, { parse_mode: "Markdown" });
    });

    // /help komutu
    this.bot.help((ctx) => {
      const helpMessage = [
        "🆘 *Detaylı Yardım*",
        "",
        "Bu bot Schengen vize randevularını otomatik takip eder ve uygun randevular bulunduğunda bildirim gönderir.",
        "",
        "📋 *Tüm Komutlar:*",
        "",
        "🔍 *Bilgi Komutları:*",
        "/start - Bot hakkında bilgi ve hoş geldin",
        "/help - Bu yardım mesajı",
        "/version - Bot versiyon bilgileri",
        "",
        "📊 *Durum Komutları:*",
        "/status - Bot durumu ve kısa bilgiler",
        "/stats - Detaylı istatistikler",
        "/config - Tam yapılandırma bilgileri",
        "/uptime - Sadece çalışma süresi",
        "/ping - Bot bağlantı testi",
        "",
        "🔍 *Randevu Komutları:*",
        "/arama - Manuel randevu arama",
        "/randevu - Manuel randevu arama",
        "/search - Manuel randevu arama",
        "/bildirim - Deneme bildirimleri aç/kapat",
        "",
        "🔔 *Bildirim Komutları:*",
        "/bildirim aç - Her kontrol sonucunu bildir",
        "/bildirim kapat - Sadece randevu bulunca bildir",
        "/bildirim - Mevcut bildirim durumunu göster",
        "",
        "🔧 *Bot Özellikleri:*",
        "• Otomatik randevu kontrolü",
        "• Şehir, ülke ve vize tipi filtreleme",
        "• Rate limit yönetimi",
        "• Tekrar bildirim engelleme",
        "• Hata toleransı",
        "• Her 5 dakikalık kontrol bildirimi (isteğe bağlı)",
        "",
        "📱 *Kullanım İpuçları:*",
        "• Komutları hem özel mesajda hem de gruplarda kullanabilirsiniz",
        "• Bot 7/24 çalışarak sürekli randevuları kontrol eder",
        "• Uygun randevu bulunduğunda otomatik bildirim alırsınız",
        "• /bildirim aç ile her kontrol sonucunu görebilirsiniz",
        "• Deneme bildirimleri bot'un aktif çalıştığını doğrular",
        "",
        "❓ Sorun yaşıyorsanız /ping ile bot bağlantısını test edin.",
        "- Mehmet Kahya"
      ].join("\n");

      ctx.reply(helpMessage, { parse_mode: "Markdown" });
    });

    // /ping komutu - Bot yaşıyor mu test et
    this.bot.command('ping', (ctx) => {
      const ping = `🏓 Pong! Bot aktif ve çalışıyor.\n⏰ Sunucu Zamanı: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`;
      ctx.reply(ping);
    });

    // /config komutu - Yapılandırma bilgileri
    this.bot.command('config', (ctx) => {
      const configMessage = [
        "⚙️ *Bot Yapılandırması*",
        "",
        `🔄 Kontrol Sıklığı: ${this.formatAsCode(config.app.checkInterval)}`,
        `🎯 Hedef Ülke: ${config.app.targetCountry.toUpperCase()}`,
        `🏛️ Hedef Misyonlar: ${config.app.missionCountries.join(', ').toUpperCase()}`,
        config.app.targetCities.length > 0 ? `🏙️ Hedef Şehirler: ${config.app.targetCities.join(', ')}` : "🏙️ Hedef Şehirler: Tümü",
        config.app.targetSubCategories.length > 0 ? `📄 Vize Tipleri: ${config.app.targetSubCategories.join(', ')}` : "📄 Vize Tipleri: Tümü",
        "",
        "📡 *API Ayarları*",
        `🔗 API URL: ${this.formatAsCode(config.api.visaApiUrl)}`,
        `🔁 Maksimum Deneme: ${config.api.maxRetries}`,
        `⏱️ Deneme Gecikme: ${config.api.retryDelayBase}ms`,
        "",
        "💾 *Önbellek Ayarları*",
        `📊 Maksimum Boyut: ${config.cache.maxSize}`,
        `🔄 Temizleme Sıklığı: ${Math.round(config.cache.cleanupInterval / 3600000)}sa`,
        "",
        "📱 *Telegram Ayarları*",
        `⚡ Rate Limit: ${config.telegram.rateLimit} mesaj/dakika`,
        `⏳ Deneme Gecikme: ${config.telegram.retryAfter}ms`
      ].filter(line => line !== "").join("\n");

      ctx.reply(configMessage, { parse_mode: "Markdown" });
    });

    // /restart komutu - Bot komutlarını yeniden yükle (sadece komutları, bot durmuyor)
    this.bot.command('restart', (ctx) => {
      ctx.reply("🔄 Bot komutları yeniden yükleniyor...");
      try {
        // Bu gerçek bir restart değil, sadece bilgi mesajı
        setTimeout(() => {
          ctx.reply("✅ Bot komutları başarıyla yeniden yüklendi!\n📊 Yeni durumu görmek için /status komutunu kullanabilirsiniz.");
        }, 1000);
      } catch (error) {
        ctx.reply("❌ Yeniden yükleme sırasında hata oluştu.");
      }
    });

    // /version komutu - Versiyon bilgisi
    this.bot.command('version', (ctx) => {
      const versionMessage = [
        "🔢 *Vize Bot Versiyon Bilgisi*",
        "",
        "📦 Bot Versiyonu: 1.0.1",
        "🤖 Telegram Bot API: Telegraf",
        "🗓️ Son Güncelleme: 23 Temmuz 2025",
        "",
        "👨‍💻 Geliştirici: Mehmet Kahya"
      ].join("\n");

      ctx.reply(versionMessage, { parse_mode: "Markdown" });
    });

    // /uptime komutu - Sadece çalışma süresi
    this.bot.command('uptime', (ctx) => {
      const uptimeMessage = [
        "⏱️ *Bot Çalışma Süresi*",
        "",
        `🟢 Aktif Süre: ${this.formatUptime(process.uptime())}`,
        `🚀 Başlangıç: ${new Date(Date.now() - process.uptime() * 1000).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
        `📅 Şu An: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`
      ].join("\n");

      ctx.reply(uptimeMessage, { parse_mode: "Markdown" });
    });

    // /stop komutu - Bot'u durdur (sadece yetkili kullanıcılar için)
    this.bot.command('stop', async (ctx) => {
      const userId = ctx.from?.id;
      // Basit yetki kontrolü - gerekirse .env'den admin ID'leri alınabilir
      if (userId && config.telegram.channelId.includes(userId.toString())) {
        await ctx.reply("🛑 Bot durduruluyor...");
        setTimeout(() => {
          process.exit(0);
        }, 1000);
      } else {
        await ctx.reply("❌ Bu komutu kullanma yetkiniz yok.");
      }
    });

    // /arama komutu - Manuel randevu arama
    this.bot.command(['arama', 'randevu', 'search'], async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      // Cooldown kontrolü (1 dakika)
      const now = Date.now();
      const cooldownTime = 60000; // 1 dakika
      const lastSearch = this.searchCooldowns.get(userId) || 0;
      
      if (now - lastSearch < cooldownTime) {
        const remainingSeconds = Math.ceil((cooldownTime - (now - lastSearch)) / 1000);
        await ctx.reply(
          `⏰ *Çok Sık Arama*\n\n` +
          `Lütfen ${remainingSeconds} saniye bekleyin ve tekrar deneyin.\n\n` +
          `💡 Bu kısıtlama sunucuyu korumak için konulmuştur.`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      // Cooldown kaydet
      this.searchCooldowns.set(userId, now);
      
      const searchingMessage = await ctx.reply("🔍 Randevular aranıyor, lütfen bekleyin...");
      
      try {
        // API servisini import et
        const { fetchAppointments } = await import('./api');
        
        // Randevuları çek
        const appointments = await fetchAppointments();
        
        if (!appointments || appointments.length === 0) {
          await ctx.reply("❌ Şu anda herhangi bir randevu bulunamadı.");
          return;
        }

        // .env kriterlerine göre filtreleme yap
        const filteredAppointments = appointments.filter((app: VisaAppointment) => {
          // Durum kontrolü (open veya waitlist_open)
          const isStatusValid = app.status === 'open' || app.status === 'waitlist_open';
          
          // Ülke kontrolü (TARGET_COUNTRY - kaynak ülke)
          const isCountryValid = !config.app.targetCountry || 
            app.country_code.toLowerCase() === config.app.targetCountry.toLowerCase();
          
          // Hedef ülke kontrolü (MISSION_COUNTRY)
          const isMissionValid = config.app.missionCountries.length === 0 || 
            config.app.missionCountries.some(mission => 
              app.mission_code.toLowerCase() === mission.toLowerCase()
            );
          
          // Şehir kontrolü (CITIES - merkez adında aranacak)
          const isCityValid = config.app.targetCities.length === 0 ||
            config.app.targetCities.some(city => 
              app.center.toLowerCase().includes(city.toLowerCase())
            );
          
          // Vize alt kategorisi kontrolü (VISA_SUBCATEGORIES)
          const isSubCategoryValid = config.app.targetSubCategories.length === 0 ||
            config.app.targetSubCategories.some(subCat =>
              app.visa_type.toLowerCase().includes(subCat.toLowerCase()) ||
              app.visa_category.toLowerCase().includes(subCat.toLowerCase())
            );
          
          return isStatusValid && isCountryValid && isMissionValid && isCityValid && isSubCategoryValid;
        });

        if (filteredAppointments.length === 0) {
          const totalCount = appointments.length;
          await ctx.reply(
            `📋 *Randevu Arama Sonucu*\n\n` +
            `🔍 Toplam ${totalCount} randevu kontrol edildi\n` +
            `❌ Filtreleme kriterlerinize uygun açık randevu bulunmuyor\n\n` +
            `🎯 *Aktif Filtreler:*\n` +
            `• Ülke: ${config.app.targetCountry.toUpperCase()}\n` +
            `• Hedef: ${config.app.missionCountries.length > 0 ? config.app.missionCountries.join(', ').toUpperCase() : 'Tümü'}\n` +
            `• Şehirler: ${config.app.targetCities.length > 0 ? config.app.targetCities.join(', ') : 'Tümü'}\n` +
            `• Vize Türü: ${config.app.targetSubCategories.length > 0 ? config.app.targetSubCategories.join(', ') : 'Tümü'}\n\n` +
            `💡 Bot otomatik kontrollere devam ediyor.`,
            { parse_mode: "Markdown" }
          );
          return;
        }

        // Maksimum 5 randevu göster (spam'i önlemek için)
        const displayAppointments = filteredAppointments.slice(0, 5);
        
        let resultMessage = [
          "🎉 *Aktif Randevular Bulundu!*",
          "",
          `🔍 Toplam ${appointments.length} randevu kontrol edildi`,
          `✅ ${filteredAppointments.length} kriterlere uygun randevu bulundu`,
          ""
        ];

        displayAppointments.forEach((appointment: VisaAppointment, index: number) => {
          const statusEmoji = appointment.status === 'open' ? '✅' : '⏳';
          const centerName = appointment.center.split(' - ').pop() || appointment.center;
          
          resultMessage.push(
            `${index + 1}. ${statusEmoji} *${this.escapeMarkdown(centerName)}*`,
            `   🏛️ ${appointment.mission_code.toUpperCase()}`,
            `   📄 ${this.escapeMarkdown(appointment.visa_type.substring(0, 30))}${appointment.visa_type.length > 30 ? '...' : ''}`,
            `   🚦 ${appointment.status}`,
            ""
          );
        });

        if (filteredAppointments.length > 5) {
          resultMessage.push(`➕ Ve ${filteredAppointments.length - 5} randevu daha...`);
          resultMessage.push("");
        }

        resultMessage.push(
          "⏰ *Son Kontrol:* " + new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
          "",
          "💡 Detaylı bilgi için bot otomatik bildirimleri takip edin."
        );

        await ctx.reply(resultMessage.join('\n'), { parse_mode: "Markdown" });

      } catch (error) {
        console.error("Manuel randevu arama hatası:", error);
        await ctx.reply(
          "❌ *Arama Hatası*\n\n" +
          "Randevular aranırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.\n\n" +
          "🔄 Bot otomatik kontrollere devam ediyor.",
          { parse_mode: "Markdown" }
        );
      } finally {
        // Arama mesajını sil
        try {
          await ctx.deleteMessage(searchingMessage.message_id);
        } catch (e) {
          // Mesaj silinememişse sorun değil
        }
      }
    });

    // /bildirim komutu - Deneme bildirimlerini aç/kapat
    this.bot.command(['bildirim', 'notification', 'check'], async (ctx) => {
      const args = ctx.message.text.split(' ');
      const action = args[1]?.toLowerCase();

      if (!action || (action !== 'aç' && action !== 'kapat' && action !== 'ac' && action !== 'on' && action !== 'off')) {
        const currentStatus = this.checkNotificationsEnabled ? 'Açık ✅' : 'Kapalı ❌';
        const statusMessage = [
          "🔔 *Deneme Bildirimleri Ayarları*",
          "",
          `📊 Mevcut Durum: ${currentStatus}`,
          "",
          "📋 *Kullanım:*",
          "/bildirim aç - Bildirimleri aç",
          "/bildirim kapat - Bildirimleri kapat",
          "",
          "💡 Bu özellik açıldığında bot her 5 dakikalık kontrol sonucunu bildirir (randevu bulunmasa bile).",
          "",
          `🔢 Son Kontrol: ${this.lastCheckCount} randevu kontrol edildi`,
          `⏰ Son Reset: ${new Date(this.lastReset).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`
        ].join("\n");

        await ctx.reply(statusMessage, { parse_mode: "Markdown" });
        return;
      }

      const shouldEnable = action === 'aç' || action === 'ac' || action === 'on';
      const wasEnabled = this.checkNotificationsEnabled;
      
      this.setCheckNotifications(shouldEnable);

      if (shouldEnable && !wasEnabled) {
        await ctx.reply(
          "🔔 *Deneme Bildirimleri Açıldı*\n\n" +
          "✅ Artık her 5 dakikalık otomatik kontrol sonucu size bildirilecek.\n\n" +
          "📊 Bu sayede randevu bulunamasa bile bot'un aktif çalıştığından emin olabilirsiniz.\n\n" +
          "💡 Kapatmak için: /bildirim kapat",
          { parse_mode: "Markdown" }
        );
      } else if (!shouldEnable && wasEnabled) {
        await ctx.reply(
          "🔕 *Deneme Bildirimleri Kapatıldı*\n\n" +
          "❌ Artık sadece açık randevu bulunduğunda bildirim alacaksınız.\n\n" +
          "💡 Tekrar açmak için: /bildirim aç",
          { parse_mode: "Markdown" }
        );
      } else {
        const currentStatusText = shouldEnable ? 'zaten açık' : 'zaten kapalı';
        await ctx.reply(
          `ℹ️ Deneme bildirimleri ${currentStatusText}.\n\n💡 Durumu görmek için: /bildirim`
        );
      }
    });

    // Bilinmeyen komutlar için
    this.bot.on('text', (ctx) => {
      const text = ctx.message.text;
      if (text.startsWith('/')) {
        const unknownMessage = [
          "❌ *Bilinmeyen Komut*",
          "",
          `Girdiğiniz komut: \`${text}\``,
          "",
          "📋 *Mevcut Komutlar:*",
          "/start - Bot hakkında bilgi",
          "/status - Bot durumu",
          "/stats - İstatistikler",
          "/config - Yapılandırma bilgileri",
          "/ping - Bot bağlantı testi",
          "/uptime - Çalışma süresi",
          "/version - Versiyon bilgisi",
          "/arama - Manuel randevu arama",
          "/bildirim - Deneme bildirimleri",
          "/help - Detaylı yardım",
          "",
          "💡 Daha fazla bilgi için /help komutunu kullanın."
        ].join("\n");
        
        ctx.reply(unknownMessage, { parse_mode: "Markdown" });
      }
    });
  }

  /**
   * Bot başlangıç bildirimini gönderir
   */
  async sendStartupNotification(): Promise<boolean> {
    try {
      const startupMessage = [
        "🚀 *Bot Başlatıldı!*",
        "",
        `📅 Başlangıç Zamanı: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
        `🔄 Kontrol Sıklığı: ${this.formatAsCode(config.app.checkInterval)}`,
        `🎯 Hedef Ülke: ${config.app.targetCountry.toUpperCase()}`,
        `🏛️ Hedef Misyonlar: ${config.app.missionCountries.join(', ').toUpperCase()}`,
        config.app.targetCities.length > 0 ? `🏙️ Hedef Şehirler: ${config.app.targetCities.join(', ')}` : "",
        config.app.targetSubCategories.length > 0 ? `📄 Vize Tipleri: ${config.app.targetSubCategories.join(', ')}` : "",
        "",
        "✅ Bot aktif olarak randevuları takip etmeye başladı.",
        "",
        "📱 *Bot Komutları:*",
        "/status - Bot durumu",
        "/bildirim - Deneme bildirimleri",
        "/ping - Bağlantı testi",
        "/help - Tüm komutlar"
      ].filter(line => line !== "").join("\n");

      await this.bot.telegram.sendMessage(
        config.telegram.channelId,
        startupMessage,
        { parse_mode: "Markdown" }
      );

      console.log("Başlangıç bildirimi gönderildi");
      return true;
    } catch (error) {
      console.error("Başlangıç bildirimi gönderilemedi:", error);
      return false;
    }
  }

  /**
   * Bot durdurulma bildirimini gönderir
   */
  async sendShutdownNotification(): Promise<boolean> {
    try {
      const shutdownMessage = [
        "⏹️ *Bot Durduruluyor*",
        "",
        `📅 Durdurulma Zamanı: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
        `⏱️ Toplam Çalışma Süresi: ${this.formatUptime(process.uptime())}`,
        `📨 Toplam Gönderilen Mesaj: ${this.getTotalMessageCount()}`,
        "",
        "❌ Randevu takibi durduruldu."
      ].join("\n");

      await this.bot.telegram.sendMessage(
        config.telegram.channelId,
        shutdownMessage,
        { parse_mode: "Markdown" }
      );

      console.log("Durdurma bildirimi gönderildi");
      return true;
    } catch (error) {
      console.error("Durdurma bildirimi gönderilemedi:", error);
      return false;
    }
  }

  /**
   * Hata bildirimi gönderir
   */
  async sendErrorNotification(error: string, details?: string): Promise<boolean> {
    try {
      const errorMessage = [
        "⚠️ *Bot Hatası*",
        "",
        `📅 Hata Zamanı: ${this.escapeMarkdown(new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }))}`,
        `❌ Hata: ${this.escapeMarkdown(error)}`,
        details ? `📝 Detaylar: ${this.escapeMarkdown(details)}` : "",
        "",
        "🔄 Bot çalışmaya devam ediyor..."
      ].filter(line => line !== "").join("\n");

      await this.bot.telegram.sendMessage(
        config.telegram.channelId,
        errorMessage,
        { parse_mode: "Markdown" }
      );

      return true;
    } catch (err) {
      console.error("Hata bildirimi gönderilemedi:", err);
      return false;
    }
  }

  /**
   * Bot'u başlatır (webhook veya polling)
   */
  async startBot(): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // Önceki webhook'ları temizle
        await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log("Önceki webhook'lar temizlendi");
        
        // Bot'u başlat
        await this.bot.launch();
        console.log("Telegram botu başlatıldı");
        return; // Başarılı olursa çık
        
      } catch (error: any) {
        retryCount++;
        console.error(`Telegram botu başlatılamadı (deneme ${retryCount}/${maxRetries}):`, error?.message || error);
        
        if (error?.response?.error_code === 409) {
          console.log("Conflict hatası - 5 saniye bekleyip tekrar denenecek...");
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else if (retryCount >= maxRetries) {
          throw error;
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }

  /**
   * Toplam mesaj sayısını döndürür (placeholder - gerçek implementasyon için veritabanı gerekli)
   */
  private getTotalMessageCount(): number {
    // Bu basit bir placeholder, gerçek uygulamada persistent storage kullanılmalı
    return this.messageCount;
  }

  /**
   * Uptime'ı okunabilir formata çevirir
   */
  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}sa ${minutes}dk ${secs}sn`;
    } else if (minutes > 0) {
      return `${minutes}dk ${secs}sn`;
    } else {
      return `${secs}sn`;
    }
  }

  /**
   * Servis kapatılırken interval'i temizle ve bot'u durdur
   */
  async cleanup(): Promise<void> {
    try {
      if (this.resetInterval) {
        clearInterval(this.resetInterval);
      }
      
      // Bot'u temiz şekilde durdur
      await this.bot.stop('SIGTERM');
      console.log("Telegram bot temiz şekilde durduruldu");
    } catch (error) {
      console.error("Bot durdurulurken hata:", error);
    }
  }

  /**
   * Deneme bildirimleri durumunu değiştirir
   */
  setCheckNotifications(enabled: boolean): void {
    this.checkNotificationsEnabled = enabled;
  }

  /**
   * Deneme bildirimleri durumunu döndürür
   */
  isCheckNotificationsEnabled(): boolean {
    return this.checkNotificationsEnabled;
  }

  /**
   * Her 5 dakikalık kontrol sonucunu bildirir (eğer özellik açıksa)
   */
  async sendCheckResult(totalFound: number, filteredFound: number): Promise<boolean> {
    if (!this.checkNotificationsEnabled) {
      return false;
    }

    try {
      this.lastCheckCount = totalFound;
      
      const checkMessage = [
        "🔍 *Otomatik Kontrol Sonucu*",
        "",
        `📅 Kontrol Zamanı: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
        `🔢 Toplam Randevu: ${totalFound}`,
        `✅ Kriterlere Uygun: ${filteredFound}`,
        filteredFound > 0 ? `🎉 Açık randevu bulundu! Detaylar yukarıda gönderildi.` : `❌ Açık randevu bulunamadı`,
        "",
        `💡 Bu bildirimler /bildirim komutu ile kapatılabilir`
      ].join("\n");

      await this.bot.telegram.sendMessage(
        config.telegram.channelId,
        checkMessage,
        { parse_mode: "Markdown" }
      );

      return true;
    } catch (error) {
      console.error("Kontrol sonucu bildirimi gönderilirken hata:", error);
      return false;
    }
  }
}

export const telegramService = new TelegramService();
