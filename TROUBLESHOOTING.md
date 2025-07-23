# Troubleshooting Guide

## Home Assistant Add-on Installation Issues

### 403 Forbidden Error from ghcr.io

If you're getting a "403 Forbidden" error when installing the add-on, this means Home Assistant is trying to pull a Docker image from GitHub Container Registry instead of building locally.

**Solution:**

1. **Clear Home Assistant Cache:**
   ```bash
   # In Home Assistant terminal/SSH
   docker system prune -f
   ha supervisor reload
   ```

2. **Force Refresh the Add-on Repository:**
   - Go to Settings → Add-ons → Add-on Store
   - Click the three dots menu (⋮) in the top right
   - Select "Reload"
   - Wait for the repository to refresh

3. **Remove and Re-add the Repository:**
   - Go to Settings → Add-ons → Add-on Store
   - Click the three dots menu (⋮) → "Repositories"
   - Remove `https://github.com/mehmetkahya0/visa-checker`
   - Add it back again
   - Refresh the page

4. **Check Supervisor Logs:**
   ```bash
   # In Home Assistant terminal/SSH
   ha supervisor logs
   ```
   Look for any build errors or configuration issues.

5. **Manual Installation (if repository method fails):**
   ```bash
   # SSH into Home Assistant
   cd /config
   git clone https://github.com/mehmetkahya0/visa-checker.git
   cp -r visa-checker/visa-checker /config/addons/
   ```
   Then go to Settings → Add-ons → Local add-ons

### Common Issues

#### 1. Build Timeout
If the build takes too long and times out:
- The first build can take 10-15 minutes on slower hardware
- Subsequent builds will be faster due to Docker layer caching
- Check available disk space: `df -h`

#### 2. Memory Issues
If build fails due to insufficient memory:
- Close other add-ons temporarily during installation
- Restart Home Assistant if memory usage is high
- Consider using Docker Compose method instead

#### 3. Architecture Issues
If you get architecture mismatch errors:
- The add-on supports: armhf, armv7, aarch64, amd64, i386
- Check your system architecture: `uname -m`
- Make sure you're running a supported Home Assistant version

### Alternative Installation Methods

#### Docker Compose (Recommended for troubleshooting)
```bash
cd /path/to/visa-checker
docker-compose -f docker-compose-homeassistant.yml up -d
```

#### Direct Docker Run
```bash
docker run -d \
  --name visa-checker \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /path/to/config:/app/config \
  -e TELEGRAM_BOT_TOKEN="your_token" \
  -e TELEGRAM_CHANNEL_ID="your_channel_id" \
  visa-checker:latest
```

### Getting Help

1. **Check Logs:**
   - Home Assistant Supervisor logs: `ha supervisor logs`
   - Add-on logs: Settings → Add-ons → Visa Checker → Logs

2. **Verify Configuration:**
   - Ensure all required environment variables are set
   - Check that Telegram bot token is valid
   - Verify network connectivity

3. **System Requirements:**
   - Home Assistant Core 2022.3.0+
   - Docker support enabled
   - At least 1GB free disk space
   - Internet connection for initial build

### Debug Mode

Enable debug mode in the add-on configuration:
```yaml
debug: true
```

This will provide more detailed logging to help diagnose issues.

### Reset Installation

If all else fails, completely reset the installation:

1. Remove the add-on if installed
2. Remove the repository from Home Assistant
3. Clear Docker cache: `docker system prune -af`
4. Restart Home Assistant
5. Re-add the repository and try again

## Docker Issues

### Permission Denied
```bash
sudo usermod -aG docker $USER
# Logout and login again
```

### Port Already in Use
```bash
# Check what's using port 3000
sudo lsof -i :3000
# Kill the process or change the port in config
```

### Build Fails
```bash
# Clean Docker cache
docker system prune -af
# Rebuild from scratch
docker-compose build --no-cache
```

## Raspberry Pi Specific Issues

### Out of Memory During Build
```bash
# Increase swap space
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### SD Card Performance
- Use a high-quality, fast SD card (Class 10 or better)
- Consider using an SSD for better performance
- Enable zram: `echo 'dtoverlay=zram' >> /boot/config.txt`

### Network Issues
```bash
# Check connectivity
ping api.visasbot.com
# Test DNS resolution
nslookup api.visasbot.com
```

## Contact

If you continue having issues:
1. Create an issue on GitHub with full error logs
2. Include your system information:
   - Home Assistant version
   - Hardware platform
   - Docker version
   - Available disk space and memory
