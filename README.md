# Accident Detection System

A mobile-based accident detection system that automatically detects accidents using device sensors and alerts emergency services.

## Features

### 🚨 Automatic Accident Detection
- **Gyroscope & Accelerometer Monitoring**: Detects sudden impacts and unusual movements
- **Microphone Monitoring**: Detects loud crash sounds
- **Multi-factor Analysis**: Combines sensor data for accurate detection
- **Severity Classification**: Categorizes accidents as low, medium, high, or critical

### ⚠️ Smart Alert System
- **Countdown Timer**: Gives user time to cancel (15-60 seconds based on severity)
- **Voice Commands**: Say "cancel", "I'm okay", or similar phrases to dismiss
- **Gesture Control**: Shake your phone to cancel the alert
- **Manual Cancel**: Tap the cancel button if you're okay

### 📍 GPS Location Tracking
- Automatically captures current location
- Sends location to emergency services
- Provides Google Maps link

### 🚑 Emergency Response
- **Automatic SMS**: Sends emergency message with location
- **Automatic Call**: Initiates call to emergency number
- **Customizable Contacts**: Set your local emergency number
- **Multiple Notifications**: Sends alerts through various channels

## How to Use

### Installation

1. **Mobile Device (Recommended)**:
   - Open the `index.html` file on your mobile device
   - For best results, use Chrome, Safari, or Edge
   - Grant all requested permissions (motion, microphone, location)

2. **Desktop Testing**:
   - Use Chrome DevTools Device Mode to simulate mobile sensors
   - Some features (actual sensor data) won't work on desktop

### Setup

1. **Configure Emergency Number**:
   - Enter your local emergency number (default: 911)
   - Click "Save"

2. **Grant Permissions**:
   - Allow motion sensor access
   - Allow microphone access
   - Allow location access

3. **Start Monitoring**:
   - Click "Start Monitoring"
   - Keep the app running in background

### Usage Scenarios

**Normal Monitoring**:
- The app continuously monitors sensors
- Dashboard shows real-time readings
- No action needed if everything is normal

**Accident Detected**:
1. Alert screen appears with countdown
2. You have 15-60 seconds to respond
3. **To Cancel Alert**:
   - Tap "I'M OKAY - CANCEL" button
   - Say "cancel", "I'm okay", or similar
   - Shake your phone vigorously
4. **If No Response**:
   - SMS sent to emergency services
   - Automatic call initiated
   - Location shared

## Technical Details

### Sensor Thresholds

**Impact Force (G-Force)**:
- Low: 2.5g
- Medium: 4.0g
- High: 6.0g
- Critical: 8.0g

**Sound Level**:
- Crash detection: 100+ dB

**Rotation**:
- Sudden rotation: 45° change

### Countdown Times by Severity
- Low: 60 seconds
- Medium: 30 seconds
- High: 20 seconds
- Critical: 15 seconds

### Browser Compatibility

**Fully Supported**:
- Chrome Mobile (Android)
- Safari (iOS)
- Edge Mobile

**Partially Supported**:
- Firefox Mobile (limited sensor access)
- Desktop browsers (for testing only)

### Required Permissions
- Device Motion
- Device Orientation
- Microphone
- Geolocation
- Vibration (optional)

## Files Structure

```
VAD/
├── index.html          # Main HTML interface
├── styles.css          # All styling
├── app.js             # Main application controller
├── sensors.js         # Sensor monitoring (accel, gyro, mic)
├── detection.js       # Accident detection algorithm
├── alert.js           # Alert UI and voice/gesture detection
├── emergency.js       # GPS and emergency notification
├── sw.js              # Service worker (offline support)
└── manifest.json      # PWA manifest
```

## Testing

### Manual Testing

**Test Impact Detection**:
1. Start monitoring
2. Gently drop your phone on a soft surface (be careful!)
3. Alert should trigger for high enough impact

**Test Alert Cancellation**:
1. Trigger an alert (or use browser console: `alertHandler.showAlert('medium', {})`)
2. Try voice: Say "cancel"
3. Try gesture: Shake phone
4. Try button: Tap cancel

**Test Emergency Flow**:
1. Trigger alert
2. Wait for countdown to reach 0
3. Verify emergency screen appears
4. Check SMS/call attempts (won't actually send without real device)

### Console Testing

Open browser console and try:
```javascript
// Trigger test alert
alertHandler.showAlert('high', { impactForce: 5.2 });

// Check sensor data
console.log(sensorManager.getSensorData());

// Check GPS position
gpsTracker.getCurrentPosition().then(pos => console.log(pos));

// Test emergency alert
emergencyHandler.sendAlert('critical', { impactForce: 8.5 });
```

## Customization

### Adjust Detection Thresholds

Edit `detection.js`:
```javascript
this.detectionThresholds = {
    lowImpact: 2.5,      // Change these values
    mediumImpact: 4.0,
    highImpact: 6.0,
    criticalImpact: 8.0
};
```

### Change Countdown Times

Edit `alert.js`:
```javascript
getCountdownTime(severity) {
    const times = {
        'low': 60,       // Modify these times
        'medium': 30,
        'high': 20,
        'critical': 15
    };
    return times[severity] || 30;
}
```

### Add More Emergency Contacts

Edit `emergency.js` to add multiple contact support.

## Limitations

1. **Sensor Availability**: Requires devices with accelerometer, gyroscope
2. **Browser Support**: Best on modern mobile browsers
3. **Battery Usage**: Continuous monitoring may drain battery
4. **False Positives**: May trigger on strong bumps or loud sounds
5. **SMS/Call**: Requires native device capabilities (not available in all browsers)

## Privacy & Security

- All data processing happens locally on your device
- No data is sent to external servers (except emergency contacts)
- Location is only captured and shared during emergencies
- Microphone data is analyzed in real-time, not stored

## Safety Notice

⚠️ **Important**: This is a supplementary safety tool and should NOT be your only method of emergency contact. Always:
- Carry a charged phone
- Know local emergency numbers
- Inform others of your plans
- Use official emergency services when possible

## License

MIT License - Feel free to modify and use for personal or commercial purposes.

## Support

For issues or questions, please check:
1. Browser console for error messages
2. Ensure all permissions are granted
3. Test on a physical mobile device (not simulator)
4. Check browser compatibility

---

**Stay Safe! 🚑**
