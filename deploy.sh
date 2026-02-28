#!/bin/bash
#
# 99.9 Game - QA & Deployment Script
# Tests the game before deploying to production
#

set -e

GAME_DIR="/mnt/data/games/datacenter-tycoon"
LIVE_URL="https://game.atilathefun.com"
REPO="atilabush/99.9"

echo "🎮 99.9 QA & Deployment System"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check if URL is accessible
check_url() {
    local url=$1
    local description=$2
    
    echo -n "Checking $description... "
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        return 1
    fi
}

# Function to check JavaScript syntax
check_js_syntax() {
    local file=$1
    
    echo -n "Checking syntax of $(basename $file)... "
    if node --check "$file" 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        return 1
    fi
}

# Run QA Tests
run_qa_tests() {
    echo ""
    echo "🔍 Running QA Tests..."
    echo "----------------------"
    
    local failed=0
    
    # Check all JS files for syntax errors
    for js_file in "$GAME_DIR"/js/*.js; do
        if ! check_js_syntax "$js_file"; then
            ((failed++))
        fi
    done
    
    # Check if main files exist
    if [ ! -f "$GAME_DIR/index.html" ]; then
        echo -e "${RED}FAIL: index.html missing${NC}"
        ((failed++))
    else
        echo -e "${GREEN}OK: index.html exists${NC}"
    fi
    
    if [ ! -f "$GAME_DIR/js/game.js" ]; then
        echo -e "${RED}FAIL: game.js missing${NC}"
        ((failed++))
    else
        echo -e "${GREEN}OK: game.js exists${NC}"
    fi
    
    # Check for common JS errors in code
    echo -n "Checking for common errors... "
    if grep -r "console\.log" "$GAME_DIR/js/" | grep -q "TODO\|FIXME\|XXX"; then
        echo -e "${YELLOW}WARN: Found TODO/FIXME in code${NC}"
    else
        echo -e "${GREEN}OK${NC}"
    fi
    
    # Check HTML for required elements
    echo -n "Checking HTML structure... "
    if grep -q "landing-screen" "$GAME_DIR/index.html" && \
       grep -q "auth-screen" "$GAME_DIR/index.html" && \
       grep -q "game-screen" "$GAME_DIR/index.html"; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAIL: Missing required screen elements${NC}"
        ((failed++))
    fi
    
    if [ $failed -gt 0 ]; then
        echo ""
        echo -e "${RED}❌ QA FAILED: $failed issue(s) found${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ QA PASSED${NC}"
    return 0
}

# Create git commit
create_commit() {
    local version=$1
    local message=$2
    
    echo ""
    echo "📝 Creating Git commit..."
    
    cd "$GAME_DIR"
    
    # Add all changes
    git add -A
    
    # Create commit
    if git commit -m "$version - $message"; then
        echo -e "${GREEN}✅ Commit created: $version${NC}"
        
        # Show recent commits
        echo ""
        echo "Recent commits:"
        git log --oneline -5
        return 0
    else
        echo -e "${YELLOW}⚠️ No changes to commit${NC}"
        return 0
    fi
}

# Push to GitHub
push_to_github() {
    echo ""
    echo "☁️ Pushing to GitHub..."
    
    cd "$GAME_DIR"
    
    if git push origin main 2>&1; then
        echo -e "${GREEN}✅ Pushed to github.com/$REPO${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ Push failed (may need authentication)${NC}"
        echo "To push manually, run:"
        echo "  cd $GAME_DIR"
        echo "  git push origin main"
        return 1
    fi
}

# Rollback to previous version
rollback() {
    echo ""
    echo "⏪ ROLLBACK INITIATED"
    echo "---------------------"
    
    cd "$GAME_DIR"
    
    echo "Recent commits:"
    git log --oneline -5
    
    echo ""
    echo "Enter commit hash to rollback to (or 'abort' to cancel):"
    read -r commit_hash
    
    if [ "$commit_hash" = "abort" ]; then
        echo "Rollback cancelled"
        return 1
    fi
    
    if git checkout "$commit_hash" -- .; then
        echo -e "${GREEN}✅ Rolled back to $commit_hash${NC}"
        echo "Files restored. Commit to save the rollback:"
        echo "  git add -A && git commit -m 'Rollback to $commit_hash'"
        return 0
    else
        echo -e "${RED}❌ Rollback failed${NC}"
        return 1
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  test          Run QA tests only"
    echo "  commit        Create git commit with version"
    echo "  deploy        Full QA test + commit + push"
    echo "  rollback      Rollback to previous commit"
    echo "  status        Show git status and recent commits"
    echo ""
    echo "Examples:"
    echo "  $0 test                          # Run tests"
    echo "  $0 commit \"v0.3.1 Fix messages\"  # Create commit"
    echo "  $0 deploy                        # Full deployment"
    echo "  $0 rollback                      # Rollback to previous"
}

# Show status
show_status() {
    cd "$GAME_DIR"
    
    echo "📊 Repository Status"
    echo "===================="
    echo ""
    
    echo "Git status:"
    git status --short
    
    echo ""
    echo "Recent commits:"
    git log --oneline -10
    
    echo ""
    echo "Remote:"
    git remote -v
}

# Main command handler
case "${1:-test}" in
    test)
        run_qa_tests
        ;;
    commit)
        version="${2:-v0.3.x}"
        message="${3:-Update}"
        create_commit "$version" "$message"
        ;;
    deploy)
        version="${2:-v0.3.x}"
        message="${3:-Update}"
        
        if run_qa_tests; then
            create_commit "$version" "$message"
            push_to_github
            echo ""
            echo -e "${GREEN}🚀 Deployment complete!${NC}"
            echo "Game live at: $LIVE_URL"
        else
            echo ""
            echo -e "${RED}❌ Deployment aborted due to QA failures${NC}"
            exit 1
        fi
        ;;
    rollback)
        rollback
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac
