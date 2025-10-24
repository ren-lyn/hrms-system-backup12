# Quick Start: Manager Leave Menu

## 🎯 One-Click Access

### What Happens When You Click "Leave Request"

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  1. You Click "Leave Request" in the Main Sidebar                       │
│                                                                          │
│     ┌────────────┐                                                      │
│     │ Dashboard  │                                                      │
│     │ Leave Req ◄── YOU CLICK HERE                                     │
│     │ Calendar   │                                                      │
│     │ Evaluation │                                                      │
│     └────────────┘                                                      │
│                                                                          │
│  2. This Happens AUTOMATICALLY:                                         │
│                                                                          │
│     ✅ Leave Management page loads in the center                        │
│     ✅ Leave Menu sidebar appears on the right                          │
│     ✅ "Leave Status" tab is selected by default                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 📺 What You See

### Layout Overview

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                         MANAGER DASHBOARD                                 ║
╠═══════════╦═══════════════════════════════════════════╦═══════════════════╣
║           ║                                           ║                   ║
║  SIDEBAR  ║         MAIN CONTENT AREA                 ║   LEAVE MENU      ║
║           ║                                           ║                   ║
║  ┌─────┐  ║  ┌────────────────────────────────────┐  ║  ┌─────────────┐  ║
║  │Dash │  ║  │  Leave Management                  │  ║  │Leave Mgmt   │  ║
║  │     │  ║  │  Last updated: 11:36:15 PM         │  ║  │           [X]│  ║
║  ├─────┤  ║  └────────────────────────────────────┘  ║  ├─────────────┤  ║
║  │Leave│◄─╬──────────────────────────────────────────╬──┤[Status][Tr..]│  ║
║  │ Req │  ║                                           ║  ├─────────────┤  ║
║  │ ✓   │  ║  ┌─ Pending Requests ─────────────┐     ║  │Approved ✓   │  ║
║  ├─────┤  ║  │  Total  Month  Week   Today     │     ║  │  (11)       │  ║
║  │Cal  │  ║  │    4      4      4      0       │     ║  │             │  ║
║  │     │  ║  └─────────────────────────────────┘     ║  │┌───────────┐│  ║
║  ├─────┤  ║                                           ║  ││Helen Ramos││  ║
║  │Eval │  ║  ┌─ Search & Filters ─────────────┐      ║  ││Sick Leave ││  ║
║  │     │  ║  │  [Search] [Period] [Refresh]   │      ║  ││Nov 29-30  ││  ║
║  ├─────┤  ║  └─────────────────────────────────┘     ║  │└───────────┘│  ║
║  │Disc │  ║                                           ║  │             │  ║
║  │     │  ║  ┌─ Leave Requests Table ─────────┐      ║  │Rejected ✗   │  ║
║  ├─────┤  ║  │ ⏰ Pending ④ ✓ Approved ⑪     │      ║  │  (8)        │  ║
║  │Rep. │  ║  │   ✗ Rejected ⑧                │      ║  │             │  ║
║  │     │  ║  ├──────────────────────────────  │      ║  │┌───────────┐│  ║
║  ├─────┤  ║  │ Employee │ Dept │ Type │...   │      ║  ││Marco S.   ││  ║
║  │Exit │  ║  │ Helen R. │ HR   │ Sick │...   │      ║  ││LOA        ││  ║
║  └─────┘  ║  │ Victor L.│ Acct │ LOA  │...   │      ║  ││Sep 30-Oct1││  ║
║           ║  │ Marco S. │ Ops  │ LOA  │...   │      ║  │└───────────┘│  ║
║           ║  └─────────────────────────────────┘     ║  └─────────────┘  ║
║           ║                                           ║                   ║
╚═══════════╩═══════════════════════════════════════════╩═══════════════════╝
   250px              Main Area (flexible)                    65% / 900px
```

## 🎨 The Leave Menu Sidebar

### Tab 1: Leave Status
```
┌────────────────────────────────┐
│ Leave Management           [X] │
├────────────────────────────────┤
│ [✓ Leave Status] [Leave Tracker]│
├────────────────────────────────┤
│                                │
│ Approved & Rejected Requests   │
│                                │
│ ┌─ ✅ Approved Requests ──┐ 11│
│ │                          │   │
│ │ Employee  │ Type │ Dates │   │
│ │───────────┼──────┼───────│   │
│ │ Helen R.  │ Sick │ Nov   │   │
│ │ Victor L. │ LOA  │ Oct   │   │
│ │ (scroll for more...)     │   │
│ └──────────────────────────┘   │
│                                │
│ ┌─ ❌ Rejected Requests ──┐  8│
│ │                          │   │
│ │ Employee  │ Type │ Dates │   │
│ │───────────┼──────┼───────│   │
│ │ Marco S.  │ LOA  │ Sep   │   │
│ │ Carla V.  │ Mat. │ Sep   │   │
│ │ (scroll for more...)     │   │
│ └──────────────────────────┘   │
│                                │
└────────────────────────────────┘
```

### Tab 2: Leave Tracker
```
┌────────────────────────────────┐
│ Leave Management           [X] │
├────────────────────────────────┤
│ [Leave Status] [✓ Leave Tracker]│
├────────────────────────────────┤
│                                │
│ Leave Tracker                  │
│                                │
│ ┌─ Statistics ──────────────┐  │
│ │ 👥 Total   👤 With  📊 Days│  │
│ │    23        15       127  │  │
│ └────────────────────────────┘  │
│                                │
│ ┌─ Filters ─────────────────┐  │
│ │ [Search...] [Dept▾] [2025]│  │
│ │ [Refresh] [PDF] [Excel]   │  │
│ └────────────────────────────┘  │
│                                │
│ ┌─ Employee Leave Summary ──┐  │
│ │ Employee │ Leave │ Balance │  │
│ │──────────┼───────┼─────────│  │
│ │ Helen R. │ 1/3   │ 2 left │  │
│ │ Victor L.│ 2/3   │ 1 left │  │
│ │ Marco S. │ 3/3   │ 0 left │  │
│ │ (scroll for more...)       │  │
│ └────────────────────────────┘  │
│                                │
└────────────────────────────────┘
```

## 🎮 Interactive Features

### Click Statistics Cards
```
Click on any stat card → Get detailed breakdown

👥 Total Employees (23)
    ↓ CLICK
    ┌─────────────────────────┐
    │ Department Breakdown     │
    │ • HR: 5 employees       │
    │ • Accounting: 8 emp.    │
    │ • Operations: 10 emp.   │
    └─────────────────────────┘
```

### Switch Tabs
```
[Leave Status] ←→ [Leave Tracker]
      ↑                ↑
   Monitor          Analytics
   Decisions        & Reports
```

### Close/Reopen Sidebar
```
Sidebar Open                    Sidebar Closed
┌─────────────┐                ┌─────────────┐
│   [X] Close │                │             │
└─────────────┘                │ [Open Menu] │
     ↓                         └─────────────┘
Sidebar Closes                      ↓
Main content                   Sidebar Opens
expands to full                    Again
```

## ⚡ Quick Actions

### Common Tasks

| I Want To... | Do This |
|-------------|---------|
| See who I approved recently | Leave Status tab → Approved section |
| Check who's still on leave | Leave Tracker tab → Click "With Leave" stat |
| Find a specific employee | Leave Tracker tab → Use search box |
| Export department report | Leave Tracker tab → Filter dept → Click PDF |
| Close the sidebar | Click [X] in sidebar header |
| Reopen the sidebar | Click "Open Leave Menu" button |

## 📱 On Different Devices

### Desktop
- Sidebar: 65% width (max 900px)
- Both areas visible simultaneously
- Best for multitasking

### Tablet
- Sidebar: 85% width
- Can see main content partially
- Touch-friendly

### Mobile
- Sidebar: Full screen
- Swipe to close
- Focused view

## ✨ Pro Tips

1. **Keep Sidebar Open** - Work on pending requests while monitoring approved/rejected
2. **Use Leave Tracker** - Export monthly reports for your records
3. **Check Statistics** - Click cards for deeper insights
4. **Filter Smart** - Use department filter to focus on your team
5. **Bookmark Tab** - Your last tab choice is remembered

## 🎯 Remember

- ✅ Sidebar opens **automatically** when you click "Leave Request"
- ✅ Two tabs: **Leave Status** (monitor) and **Leave Tracker** (analyze)
- ✅ Can **close** anytime and **reopen** with one click
- ✅ **No backdrop** - you can still work with main content
- ✅ All your leave management tools in **one place**

## 🚀 Start Now!

1. Click **"Leave Request"** in your sidebar
2. See the **Leave Menu** appear automatically
3. Choose your tab: **Status** or **Tracker**
4. Start managing leaves more efficiently!

That's it! Simple, powerful, and always at your fingertips. 🎉

