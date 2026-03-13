# SpendWise - Advanced Expense Tracker Documentation

## 🚀 Overview
SpendWise is a premium financial tracking application built with React, Vite, Tailwind CSS, and Firebase. This document outlines the recently implemented UI enhancements and advanced features.

## 🎨 UI/UX Architecture

### 1. Modern Sidebar Navigation
- **Responsive Design**: A sleek, fixed sidebar for desktop and a collapsible menu for mobile.
- **Lucide Icons**: Replaced basic emojis with professional, high-quality icons from the `lucide-react` library.
- **Dynamic Active States**: Clear visual feedback on the current location using primary color highlights and subtle shadows.
- **Glassmorphism**: Applied backdrop-blur and semi-transparent backgrounds to headers and navigation for a modern, airy feel.

### 2. Premium Design System
- **Tailwind CSS 4**: Utilizes the latest Tailwind features for performance and flexibility.
- **Sophisticated Color Palette**: A carefully curated dark/light theme supporting system preferences.
- **Smooth Animations**: Custom cubic-bezier transitions for all interactive elements and page entries.
- **Typography**: Focused on readability with Inter and DM Sans, featuring black-weighted headers for a bold, modern look.

## ✨ New Features

### 1. Financial Calendar
- **Daily Visualization**: A full-screen calendar view to see exactly when you're spending.
- **Quick Add**: Integration with the Add Expense page directly from any date on the calendar.
- **Daily Totals**: Automatic calculation and display of total spending for each day.
- **Monthly Insights**: At-a-glance summary of monthly totals and daily averages within the calendar view.

### 2. Advanced Profile Management
- **Detailed Profiles**: Users can now manage more than just their email.
- **Custom Bio**: Add a personal touch or financial goals to your profile.
- **Currency Preferences**: Set your preferred currency (USD, EUR, GBP, PKR) which propagates throughout the app.
- **Avatar Support**: Display user initials or custom profile photos.

### 3. Enhanced Dashboard
- **Real-time Stats**: Instant calculation of total spent, budget remaining, and daily averages.
- **Visual Analytics**: Interactive pie charts for spending breakdown by category.
- **Wallet Management**: Visual representation of cash and multiple bank cards with real-time balances.
- **Recent Activity**: Quick access to the most recent transactions with category icons and payment methods.

## 🛠 Technical Details

### State Management
- **Context API**: Clean separation of concerns using `AuthContext`, `ExpenseContext`, `BudgetContext`, and `CategoryContext`.
- **Firebase Sync**: Real-time synchronization with Firestore for user data and expenses.

### Utility Helpers
- `cn`: A powerful utility for conditional class merging using `clsx` and `tailwind-merge`.
- `formatCurrency`: Internationalized currency formatting based on user preferences.

---
*SpendWise - Smart Financial Tracking*
