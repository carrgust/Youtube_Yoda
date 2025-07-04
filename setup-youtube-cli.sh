#!/bin/bash

# YouTube CLI Setup Script
# Sets up the YouTube CLI for easy terminal access

echo "🚀 YouTube CLI Setup"
echo "==================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get current directory
YOUTUBE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Step 1: Check Node.js
echo -e "\n${YELLOW}Checking dependencies...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found${NC}"

# Step 2: Install npm dependencies
echo -e "\n${YELLOW}Installing npm dependencies...${NC}"
cd "$YOUTUBE_DIR"
npm install commander chalk inquirer ora cli-table3 open dotenv

# Step 3: Install TypeScript dependencies if needed
npm install --save-dev @types/node @types/inquirer ts-node typescript

# Step 4: Create symlink for global access
echo -e "\n${YELLOW}Creating global command...${NC}"
SYMLINK_PATH="/usr/local/bin/youtube-cli"
if [ -L "$SYMLINK_PATH" ]; then
    echo "Removing existing symlink..."
    sudo rm "$SYMLINK_PATH"
fi
sudo ln -s "$YOUTUBE_DIR/youtube" "$SYMLINK_PATH"
echo -e "${GREEN}✓ Created global 'youtube-cli' command${NC}"

# Step 5: Setup shell integration
echo -e "\n${YELLOW}Setting up shell integration...${NC}"

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    SHELL_RC="$HOME/.profile"
    SHELL_NAME="sh"
fi

# Add source line to shell RC
ALIAS_SOURCE="source $YOUTUBE_DIR/youtube-cli-aliases.sh"
if ! grep -q "youtube-cli-aliases.sh" "$SHELL_RC" 2>/dev/null; then
    echo -e "\n# YouTube CLI Integration" >> "$SHELL_RC"
    echo "$ALIAS_SOURCE" >> "$SHELL_RC"
    echo -e "${GREEN}✓ Added YouTube CLI aliases to $SHELL_RC${NC}"
else
    echo -e "${GREEN}✓ YouTube CLI aliases already configured${NC}"
fi

# Step 6: Create .env template if not exists
if [ ! -f "$YOUTUBE_DIR/.env" ]; then
    echo -e "\n${YELLOW}Creating .env template...${NC}"
    cat > "$YOUTUBE_DIR/.env" << 'EOF'
# YouTube API Credentials
# Get these from https://console.cloud.google.com/
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback

# Optional settings
NODE_ENV=development
EOF
    echo -e "${GREEN}✓ Created .env template${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env and add your YouTube API credentials${NC}"
fi

# Step 7: Desktop Commander integration
echo -e "\n${YELLOW}Setting up Desktop Commander integration...${NC}"

# Create DC wrapper script
cat > "$YOUTUBE_DIR/youtube-dc.sh" << 'EOF'
#!/bin/bash
# YouTube Desktop Commander Integration

# Function to handle file selection with DC
yt_dc_upload() {
    echo "Using Desktop Commander to manage YouTube uploads..."
    
    # List video files in current directory
    echo "Video files in current directory:"
    ls -la *.{mp4,mov,avi,mkv,webm} 2>/dev/null || echo "No video files found"
    
    read -p "Enter video file path: " filepath
    if [ -f "$filepath" ]; then
        youtube-cli video upload "$filepath"
    else
        echo "File not found: $filepath"
    fi
}

# Batch upload with DC
yt_dc_batch() {
    local dir="${1:-.}"
    echo "Batch uploading videos from: $dir"
    
    for video in "$dir"/*.{mp4,mov,avi,mkv,webm}; do
        if [ -f "$video" ]; then
            echo "Uploading: $video"
            youtube-cli video upload "$video" --privacy private
        fi
    done
}

# Main DC interface
case "$1" in
    upload)
        yt_dc_upload
        ;;
    batch)
        yt_dc_batch "$2"
        ;;
    *)
        echo "YouTube Desktop Commander"
        echo "Usage: $0 [upload|batch] [directory]"
        ;;
esac
EOF

chmod +x "$YOUTUBE_DIR/youtube-dc.sh"
echo -e "${GREEN}✓ Created Desktop Commander integration${NC}"

# Step 8: Create quick start guide
cat > "$YOUTUBE_DIR/QUICKSTART.md" << 'EOF'
# YouTube CLI Quick Start Guide

## First Time Setup

1. **Get YouTube API Credentials:**
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials
   - Add http://localhost:3000/auth/youtube/callback to redirect URIs

2. **Add credentials to .env file:**
   ```
   YOUTUBE_CLIENT_ID=your_client_id
   YOUTUBE_CLIENT_SECRET=your_client_secret
   ```

3. **Authenticate:**
   ```bash
   youtube-cli auth
   ```

## Quick Commands

```bash
# View channel info
youtube-cli channel

# List videos
youtube-cli video list

# Upload video
youtube-cli video upload video.mp4

# Interactive mode
youtube-cli interactive

# Using aliases (after restarting shell)
ytinfo          # Dashboard view
ytupload file   # Quick upload
ytsearch "query" # Search videos
```

## Desktop Commander Integration

```bash
# Interactive upload
./youtube-dc.sh upload

# Batch upload directory
./youtube-dc.sh batch /path/to/videos
```
EOF

echo -e "${GREEN}✓ Created QUICKSTART.md${NC}"

# Final instructions
echo -e "\n${GREEN}✅ YouTube CLI Setup Complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Edit .env file with your YouTube API credentials"
echo "2. Restart your shell or run: source $SHELL_RC"
echo "3. Run: youtube-cli auth"
echo "4. Try: youtube-cli channel"
echo -e "\n${YELLOW}Available commands after shell restart:${NC}"
echo "  youtube-cli - Main command"
echo "  yt         - Short alias"
echo "  ythelp     - Show all commands"
echo "  ytinfo     - Dashboard view"
echo -e "\n${GREEN}Happy YouTubing! 🎬${NC}"