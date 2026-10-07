# Tactical Ballistics Calculator

A web-based ballistics calculator designed for calculating artillery trajectories, charges, and targeting data. This tool processes raw tabular ballistic data and dynamically interpolates values to provide accurate firing solutions in real-time.

## 🚀 Features
* **Dynamic Data Interpolation:** Parses raw ballistic tables (distance, elevation, time of flight) and calculates precise intermediate values using mathematical interpolation.
* **Multi-Weapon Database:** Modular architecture allows registering multiple weapon types (mortars, howitzers, MLRS) via isolated `.js` database files (e.g., `2B14`, `BM-21`, `M777`).
* **Real-time Trajectory Calculation:** Instantly computes firing solutions based on selected weapon, projectile type, trajectory (Low/High), and charge.
* **Responsive UI:** Clean, intuitive HTML/CSS interface designed for quick data entry and retrieval during high-stress simulations.

## 🛠️ Technical Stack
* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3.
* **Data Processing:** Regex-based string parsing and custom mathematical interpolation logic.
* **Architecture:** Modular database system (`window.registerWeapon` pattern) for easy expansion without modifying core logic.

## 💡 How it works
The calculator loads raw ballistic tables containing arrays of values (Range, Elevation). When a user inputs a specific target distance, the `app.js` script finds the two closest known data points in the table and mathematically interpolates the exact elevation and time-of-flight required to hit the target.
