#!/bin/bash

# Install Rust
 curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify Rust installation
 rustc --version

# Install Solana tools
 sh -c "$(curl -sSfL https://release.solana.com/v1.8.5/install)"

# Navigate to Development folder or create if it does not exist
mkdir -p ~/Development
 cd ~/Development

# Create DeFi project directory
 mkdir rust-defi
 cd rust-defi/

# Create new Rust library project
 cargo new --lib my_defi_project

# Go to project folder
 cd my_defi_project

# Build the project
 cargo build