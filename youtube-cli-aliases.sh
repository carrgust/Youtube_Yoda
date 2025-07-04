#!/bin/bash

# YouTube CLI Aliases and Functions
# Add this to your ~/.bashrc or ~/.zshrc:
# source /path/to/youtube-cli-aliases.sh

# Base YouTube CLI path
YOUTUBE_CLI="/Users/gustavocarriconde/github/Youtube_Yoda/youtube"

# Quick aliases
alias yt="$YOUTUBE_CLI"
alias ytauth="$YOUTUBE_CLI auth"
alias ytchannel="$YOUTUBE_CLI channel"
alias ytvideos="$YOUTUBE_CLI video list"
alias ytupload="$YOUTUBE_CLI video upload"
alias ytanalytics="$YOUTUBE_CLI analytics"
alias yti="$YOUTUBE_CLI interactive"

# Advanced functions
function ytsearch() {
    $YOUTUBE_CLI video list --search "$1" --limit "${2:-10}"
}

function ytquickupload() {
    local file="$1"
    local title="${2:-$(basename "$file" | sed 's/\.[^.]*$//')}"
    $YOUTUBE_CLI video upload "$file" --title "$title" --privacy private
}

function ytstats() {
    echo "📊 YouTube Channel Statistics"
    echo "=========================="
    $YOUTUBE_CLI channel | grep -E "(Subscribers|Views|Video Count)"
}

function ytlast() {
    echo "📹 Latest Videos"
    echo "==============="
    $YOUTUBE_CLI video list --limit "${1:-5}"
}

function ytvideo() {
    local video_id="$1"
    if [ -z "$video_id" ]; then
        echo "Usage: ytvideo <video-id>"
        return 1
    fi
    $YOUTUBE_CLI analytics "$video_id"
}

# Desktop Commander Integration
function ytdc() {
    case "$1" in
        "upload")
            # Use Desktop Commander to select file
            echo "Select a video file to upload..."
            read -p "Enter file path: " filepath
            ytquickupload "$filepath" "$2"
            ;;
        "batch")
            # Batch upload from directory
            local dir="${2:-.}"
            echo "Batch uploading from $dir..."
            for video in "$dir"/*.{mp4,mov,avi}; do
                [ -f "$video" ] && ytquickupload "$video"
            done
            ;;
        "watch")
            # Watch directory for new videos
            echo "Watching directory for new videos..."
            fswatch -o "${2:-.}" | while read f; do
                echo "New file detected, uploading..."
                ytquickupload "$f"
            done
            ;;
        *)
            echo "Usage: ytdc [upload|batch|watch] [path]"
            ;;
    esac
}

# Quick info display
function ytinfo() {
    clear
    echo "╔══════════════════════════════════════════╗"
    echo "║       YouTube Channel Dashboard           ║"
    echo "╚══════════════════════════════════════════╝"
    echo
    $YOUTUBE_CLI channel
    echo
    echo "📹 Recent Videos:"
    $YOUTUBE_CLI video list --limit 3
}

# Help function
function ythelp() {
    echo "YouTube CLI Quick Reference"
    echo "=========================="
    echo
    echo "Basic Commands:"
    echo "  yt              - Main YouTube CLI"
    echo "  ytauth          - Authenticate with YouTube"
    echo "  ytchannel       - Show channel info"
    echo "  ytvideos        - List videos"
    echo "  ytupload <file> - Upload a video"
    echo "  ytanalytics     - Show analytics"
    echo "  yti             - Interactive mode"
    echo
    echo "Quick Functions:"
    echo "  ytsearch <query> [limit]     - Search videos"
    echo "  ytquickupload <file> [title] - Quick upload"
    echo "  ytstats                      - Channel statistics"
    echo "  ytlast [count]              - Show latest videos"
    echo "  ytvideo <id>                - Video analytics"
    echo "  ytinfo                      - Dashboard view"
    echo
    echo "Desktop Commander:"
    echo "  ytdc upload     - Interactive upload"
    echo "  ytdc batch      - Batch upload directory"
    echo "  ytdc watch      - Watch directory for uploads"
}

# Auto-complete for bash/zsh
if [ -n "$BASH_VERSION" ]; then
    complete -f -X '!*.@(mp4|mov|avi|mkv|webm)' ytupload ytquickupload
elif [ -n "$ZSH_VERSION" ]; then
    compdef '_files -g "*.{mp4,mov,avi,mkv,webm}"' ytupload ytquickupload
fi

echo "YouTube CLI aliases loaded! Type 'ythelp' for commands."