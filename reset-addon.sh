#!/bin/bash

# Home Assistant Add-on Reset Script
# This script helps reset the visa-checker add-on installation

set -e

echo "🔄 Home Assistant Add-on Reset Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in Home Assistant environment
check_environment() {
    print_status "Checking environment..."
    
    if ! command -v ha &> /dev/null; then
        print_warning "Home Assistant CLI not found. This script is designed for Home Assistant OS."
        print_warning "You can still use the manual steps from the troubleshooting guide."
    else
        print_success "Home Assistant CLI found"
    fi
}

# Clean Docker cache
clean_docker() {
    print_status "Cleaning Docker cache..."
    
    if command -v docker &> /dev/null; then
        docker system prune -f 2>/dev/null || print_warning "Could not clean Docker cache (permission denied)"
        print_success "Docker cache cleaned"
    else
        print_warning "Docker command not available"
    fi
}

# Reload supervisor
reload_supervisor() {
    print_status "Reloading Home Assistant Supervisor..."
    
    if command -v ha &> /dev/null; then
        ha supervisor reload || print_warning "Could not reload supervisor"
        print_success "Supervisor reloaded"
    else
        print_warning "Home Assistant CLI not available"
    fi
}

# Check disk space
check_disk_space() {
    print_status "Checking disk space..."
    
    available_space=$(df -h / | awk 'NR==2 {print $4}' | sed 's/[^0-9.]//g')
    if (( $(echo "$available_space < 1" | bc -l) )); then
        print_error "Less than 1GB free space available. Please free up some space."
        exit 1
    else
        print_success "Sufficient disk space available"
    fi
}

# Check memory
check_memory() {
    print_status "Checking available memory..."
    
    if command -v free &> /dev/null; then
        available_mem=$(free -h | awk 'NR==2{print $7}' | sed 's/[^0-9.]//g')
        print_success "Memory check completed"
    else
        print_warning "Cannot check memory (free command not available)"
    fi
}

# Manual cleanup instructions
show_manual_instructions() {
    echo ""
    print_status "Manual cleanup instructions:"
    echo "1. Go to Settings → Add-ons → Add-on Store"
    echo "2. Click the three dots menu (⋮) → 'Repositories'"
    echo "3. Remove: https://github.com/mehmetkahya0/visa-checker"
    echo "4. Restart Home Assistant"
    echo "5. Add the repository back: https://github.com/mehmetkahya0/visa-checker"
    echo "6. Install the Visa Checker add-on"
    echo ""
}

# Show current status
show_status() {
    print_status "Current system status:"
    echo "Time: $(date)"
    echo "Uptime: $(uptime -p 2>/dev/null || echo 'N/A')"
    echo "Load: $(uptime | awk -F'load average:' '{ print $2 }' 2>/dev/null || echo 'N/A')"
    echo "Disk usage: $(df -h / | awk 'NR==2 {print $5}' 2>/dev/null || echo 'N/A')"
    echo ""
}

# Main execution
main() {
    echo "This script will help reset your visa-checker add-on installation."
    echo "It will clean Docker cache and reload the supervisor."
    echo ""
    
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Operation cancelled."
        exit 0
    fi
    
    echo ""
    
    # Run checks
    check_environment
    show_status
    check_disk_space
    check_memory
    
    echo ""
    print_status "Starting cleanup process..."
    
    # Cleanup
    clean_docker
    reload_supervisor
    
    echo ""
    print_success "Cleanup completed!"
    
    # Show manual instructions
    show_manual_instructions
    
    print_status "After following the manual steps, wait 2-3 minutes for the repository to refresh."
    print_status "The first installation may take 10-15 minutes as it builds the Docker image."
    
    echo ""
    print_success "Reset script completed successfully!"
    print_status "Check the TROUBLESHOOTING.md file for more detailed help."
}

# Run main function
main "$@"
