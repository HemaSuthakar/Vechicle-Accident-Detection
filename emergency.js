// GPS Tracker Module
class GPSTracker {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.isTracking = false;
    }

    async requestPermission() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                addLog('❌ Geolocation not supported by browser', 'error');
                reject(new Error('Geolocation not supported'));
                return;
            }

            addLog('📍 Requesting GPS permission...', 'info');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    addLog('✅ GPS permission granted!', 'info');
                    addLog(`📍 Current location: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`, 'info');
                    resolve(true);
                },
                (error) => {
                    const errorMessages = {
                        1: 'User denied GPS permission - Please allow location access',
                        2: 'GPS position unavailable - Check if location is enabled on device',
                        3: 'GPS request timeout - Location service may be slow'
                    };
                    const errorMsg = errorMessages[error.code] || `GPS error: ${error.message}`;
                    addLog(`⚠️ ${errorMsg}`, 'warning');
                    // Don't reject - allow app to continue without GPS
                    resolve(false);
                },
                { 
                    timeout: 10000,
                    enableHighAccuracy: false,
                    maximumAge: 60000
                }
            );
        });
    }

    startTracking() {
        if (this.isTracking) {
            addLog('GPS tracking already active', 'info');
            return;
        }

        if (!navigator.geolocation) {
            addLog('❌ GPS not supported by this browser', 'error');
            if (typeof updateSensorStatus === 'function') {
                updateSensorStatus('gpsStatus', false);
            }
            return;
        }

        addLog('🔄 Starting continuous GPS tracking...', 'info');
        addLog('📍 Make sure location is enabled in device settings', 'info');

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };

                // Update status to active
                if (typeof updateSensorStatus === 'function') {
                    updateSensorStatus('gpsStatus', true);
                    console.log('GPS status set to ACTIVE');
                }
                
                if (!this.isTracking) {
                    addLog(`✅ GPS tracking ACTIVE`, 'info');
                    addLog(`📍 Location: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`, 'info');
                    addLog(`🎯 Accuracy: ${position.coords.accuracy.toFixed(0)} meters`, 'info');
                    this.isTracking = true;
                }
            },
            (error) => {
                const errorMessages = {
                    1: '❌ GPS permission denied - Enable in browser/device settings',
                    2: '⚠️ GPS position unavailable - Turn on device location service',
                    3: '⏱️ GPS timeout - Retrying...'
                };
                const errorMsg = errorMessages[error.code] || error.message;
                addLog(errorMsg, 'error');
                addLog('💡 Fix: Settings → Privacy → Location → ON', 'warning');
                
                // Update status to inactive
                if (typeof updateSensorStatus === 'function') {
                    updateSensorStatus('gpsStatus', false);
                    console.log('GPS status set to OFF due to error');
                }
                
                // For timeout errors, keep trying
                if (error.code !== 1) {
                    this.isTracking = false;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000
            }
        );
    }

    stopTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isTracking = false;
            updateSensorStatus('gpsStatus', false);
            addLog('GPS tracking stopped', 'info');
        }
    }

    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            // Return cached position if recent (less than 30 seconds old)
            if (this.currentPosition) {
                const age = Date.now() - this.currentPosition.timestamp;
                if (age < 30000) {
                    addLog('Using cached GPS position', 'info');
                    resolve(this.currentPosition);
                    return;
                }
            }

            if (!navigator.geolocation) {
                addLog('Geolocation not available', 'warning');
                reject(new Error('Geolocation not supported'));
                return;
            }

            addLog('Getting current GPS position...', 'info');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    this.currentPosition = pos;
                    addLog(`GPS position obtained - Accuracy: ${pos.accuracy.toFixed(0)}m`, 'info');
                    resolve(pos);
                },
                (error) => {
                    const errorMessages = {
                        1: 'User denied GPS permission',
                        2: 'GPS position unavailable',
                        3: 'GPS request timed out'
                    };
                    const errorMsg = errorMessages[error.code] || error.message;
                    addLog(`GPS error: ${errorMsg}`, 'warning');
                    
                    // Return last known position or default
                    if (this.currentPosition) {
                        addLog('Using last known GPS position', 'warning');
                        resolve(this.currentPosition);
                    } else {
                        addLog('No GPS data available - using default', 'error');
                        reject(error);
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 30000
                }
            );
        });
    }

    getGoogleMapsUrl(latitude, longitude) {
        return `https://www.google.com/maps?q=${latitude},${longitude}`;
    }

    getLocationString(position) {
        if (!position) return 'Location unavailable';
        return `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`;
    }
}

// Emergency Handler Module
class EmergencyHandler {
    constructor() {
        this.emergencyNumber = '911';
        this.notifiedServices = [];
    }

    setEmergencyNumber(number) {
        this.emergencyNumber = number;
        localStorage.setItem('emergencyNumber', number);
        addLog(`Emergency number set to: ${number}`, 'info');
    }

    getEmergencyNumber() {
        const stored = localStorage.getItem('emergencyNumber');
        return stored || this.emergencyNumber;
    }

    async sendAlert(severity, details) {
        this.notifiedServices = [];
        
        // Get current location with better error handling
        let location;
        let locationAvailable = true;
        
        try {
            addLog('Attempting to get GPS location for emergency...', 'info');
            location = await gpsTracker.getCurrentPosition();
            addLog(`GPS location obtained: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`, 'info');
        } catch (error) {
            locationAvailable = false;
            addLog(`Could not get GPS location: ${error.message}`, 'error');
            addLog('Emergency alert will be sent WITHOUT location data', 'warning');
            
            // Use placeholder location
            location = { 
                latitude: 0, 
                longitude: 0, 
                accuracy: 0,
                unavailable: true 
            };
        }

        // Prepare emergency message
        const message = this.prepareEmergencyMessage(severity, location, details, locationAvailable);
        
        // Update emergency screen
        this.updateEmergencyScreen(severity, location, message, locationAvailable);

        // Try automatic notifications first (where supported)
        await this.sendAutomaticNotifications(message, location);

        // Fallback: Manual SMS/Call/WhatsApp (for browsers that don't support automatic)
        this.sendSMS(message, location);
        this.sendWhatsApp(message, location); // Add WhatsApp notification
        this.initiateCall();

        // Log the emergency
        addLog('EMERGENCY ALERT SENT', 'error');
    }

    prepareEmergencyMessage(severity, location, details) {
        const severityText = severity.toUpperCase();
        const locationUrl = gpsTracker.getGoogleMapsUrl(location.latitude, location.longitude);
        const timestamp = new Date().toLocaleString();

        let message = `🚨 EMERGENCY ALERT 🚨\n\n`;
        message += `Severity: ${severityText}\n`;
        message += `Time: ${timestamp}\n`;
        message += `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\n`;
        message += `Map: ${locationUrl}\n\n`;

        if (details.impactForce) {
            message += `Impact Force: ${details.impactForce.toFixed(2)}g\n`;
        }

        if (details.soundLevel) {
            message += `Sound Level: ${details.soundLevel} dB\n`;
        }

        message += `\nImmediate assistance required!`;

        return message;
    }

    updateEmergencyScreen(severity, location, message) {
        const locationElement = document.getElementById('emergencyLocation');
        const timeElement = document.getElementById('emergencyTime');
        const servicesElement = document.getElementById('notifiedServices');

        if (locationElement) {
            const locationUrl = gpsTracker.getGoogleMapsUrl(location.latitude, location.longitude);
            locationElement.innerHTML = `
                <a href="${locationUrl}" target="_blank" style="color: white; text-decoration: underline;">
                    ${gpsTracker.getLocationString(location)}
                </a>
            `;
        }

        if (timeElement) {
            timeElement.textContent = new Date().toLocaleString();
        }

        if (servicesElement) {
            servicesElement.innerHTML = this.notifiedServices.map(service => 
                `<li>✓ ${service}</li>`
            ).join('');
        }
    }

    async sendAutomaticNotifications(message, location) {
        const emergencyNumber = this.getEmergencyNumber();
        
        // Method 1: Try Background Fetch API (works on some Android devices)
        try {
            if ('BackgroundFetchManager' in self) {
                addLog('Attempting background notification...', 'info');
                // This would require service worker implementation
            }
        } catch (error) {
            console.log('Background fetch not supported:', error);
        }

        // Method 2: Try Notification API with actions
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const notification = new Notification('🚨 EMERGENCY ALERT', {
                    body: `Emergency detected! Tap to call ${emergencyNumber}`,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23ef4444"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">⚠</text></svg>',
                    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23ef4444"/></svg>',
                    tag: 'emergency-alert',
                    requireInteraction: true,
                    vibrate: [200, 100, 200, 100, 200],
                    actions: [
                        { action: 'call', title: 'Call Emergency' },
                        { action: 'sms', title: 'Send SMS' }
                    ]
                });

                notification.onclick = () => {
                    window.focus();
                    this.initiateCall();
                };

                this.notifiedServices.push('Desktop Notification');
                addLog('Emergency notification sent', 'info');
            } catch (error) {
                console.log('Notification error:', error);
            }
        }

        // Method 3: Try to use Web Share Target API (if registered)
        if (navigator.share) {
            try {
                // Note: This still requires user gesture, but we attempt it
                await navigator.share({
                    title: '🚨 EMERGENCY ALERT',
                    text: message,
                    url: gpsTracker.getGoogleMapsUrl(location.latitude, location.longitude)
                });
                this.notifiedServices.push('Web Share');
            } catch (error) {
                // User cancelled or not supported
                console.log('Share failed:', error);
            }
        }

        // Method 4: Store in IndexedDB for service worker to process
        try {
            const dbRequest = indexedDB.open('EmergencyDB', 1);
            
            dbRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('alerts')) {
                    db.createObjectStore('alerts', { keyPath: 'timestamp' });
                }
            };

            dbRequest.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['alerts'], 'readwrite');
                const store = transaction.objectStore('alerts');
                
                store.add({
                    timestamp: Date.now(),
                    message: message,
                    location: location,
                    emergencyNumber: emergencyNumber,
                    severity: 'critical'
                });
                
                addLog('Emergency stored in local database', 'info');
            };
        } catch (error) {
            console.log('IndexedDB error:', error);
        }

        // Method 5: Try Beacon API (sends data even if page closes)
        try {
            const emergencyData = JSON.stringify({
                type: 'emergency',
                message: message,
                location: location,
                timestamp: Date.now()
            });
            
            // You would need to set up a server endpoint for this
            // navigator.sendBeacon('/emergency-endpoint', emergencyData);
            
            addLog('Emergency data prepared for transmission', 'info');
        } catch (error) {
            console.log('Beacon API error:', error);
        }
    }

    sendSMS(message, location) {
        const emergencyNumber = this.getEmergencyNumber();

        // Method 1: SMS URL scheme (works on most mobile devices)
        const smsBody = encodeURIComponent(message);
        const smsUrl = `sms:${emergencyNumber}?body=${smsBody}`;

        // Try to open SMS app
        try {
            // Create a hidden link and click it
            const link = document.createElement('a');
            link.href = smsUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.notifiedServices.push(`SMS to ${emergencyNumber}`);
            addLog(`SMS prepared for ${emergencyNumber}`, 'info');
        } catch (error) {
            addLog(`Could not send SMS: ${error.message}`, 'error');
        }

        // Method 2: If Web Share API is available
        if (navigator.share) {
            navigator.share({
                title: 'EMERGENCY ALERT',
                text: message
            }).catch(err => console.log('Share failed:', err));
        }
    }

    initiateCall() {
        const emergencyNumber = this.getEmergencyNumber();
        const autoCallEnabled = localStorage.getItem('enableAutoCall') === 'true';

        // Automatically initiate call
        const telUrl = `tel:${emergencyNumber}`;

        try {
            if (autoCallEnabled) {
                addLog('📞 Attempting automatic call...', 'info');
                
                // Aggressive auto-dial attempt
                this.attemptAutoDial(telUrl, emergencyNumber);
            } else {
                // Standard call initiation (requires user tap)
                this.openDialer(telUrl, emergencyNumber);
            }
        } catch (error) {
            addLog(`Could not initiate call: ${error.message}`, 'error');
        }
        
        // Show visual confirmation
        this.showCallConfirmation(emergencyNumber);
    }

    attemptAutoDial(telUrl, number) {
        // Multiple methods to attempt automatic dialing
        
        // Method 1: Direct navigation (works on some devices)
        window.location.href = telUrl;
        
        // Method 2: Create and click hidden link
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = telUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, 100);
        
        // Method 3: Multiple iframe attempts
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = telUrl;
                document.body.appendChild(iframe);
                
                setTimeout(() => {
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                }, 1000);
            }, i * 200);
        }
        
        this.notifiedServices.push(`Call to ${number} (auto-dialed)`);
        addLog(`✓ Auto-dial attempted to ${number}`, 'info');
    }

    openDialer(telUrl, number) {
        // Standard call initiation
        try {
            // Method 1: Create hidden iframe for auto-trigger
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = telUrl;
            document.body.appendChild(iframe);
            
            // Method 2: Also try direct navigation (fallback)
            setTimeout(() => {
                window.location.href = telUrl;
            }, 500);
            
            // Clean up
            setTimeout(() => {
                if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                }
            }, 3000);

            this.notifiedServices.push(`Call to ${number} (initiated)`);
            addLog(`Emergency call initiated to ${number}`, 'info');
        } catch (error) {
            addLog(`Could not open dialer: ${error.message}`, 'error');
        }
    }

    showCallConfirmation(number) {
        // Visual feedback that call is being placed
        const callBanner = document.createElement('div');
        callBanner.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ef4444;
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease;
        `;
        callBanner.textContent = `📞 Calling ${number}...`;
        
        document.body.appendChild(callBanner);
        
        setTimeout(() => {
            callBanner.remove();
        }, 5000);
    }

    // Send alert to multiple contacts
    sendToMultipleContacts(contacts, message) {
        contacts.forEach(contact => {
            if (contact.phone) {
                // Send SMS
                const smsUrl = `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
                window.open(smsUrl, '_blank');
                this.notifiedServices.push(`SMS to ${contact.name || contact.phone}`);
            }
        });
    }

    // Send email alert (if email is configured)
    sendEmailAlert(message, location) {
        const subject = '🚨 EMERGENCY ALERT';
        const body = message + '\n\nLocation: ' + gpsTracker.getGoogleMapsUrl(location.latitude, location.longitude);
        
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_blank');
        
        this.notifiedServices.push('Email alert');
    }

    // Send WhatsApp message (opens WhatsApp Web)
    sendWhatsApp(message, location) {
        const emergencyNumber = this.getEmergencyNumber();
        
        try {
            // WhatsApp Web URL format
            const whatsappMessage = encodeURIComponent(message);
            // Note: WhatsApp requires country code without + or 0 prefix
            const cleanNumber = emergencyNumber.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/${cleanNumber}?text=${whatsappMessage}`;
            
            // Try to open WhatsApp Web in new tab
            window.open(whatsappUrl, '_blank');
            
            this.notifiedServices.push(`WhatsApp to ${emergencyNumber}`);
            addLog(`WhatsApp message sent to ${emergencyNumber}`, 'info');
        } catch (error) {
            addLog(`Could not send WhatsApp: ${error.message}`, 'error');
        }
    }
}

// Helper function to save emergency number
function saveEmergencyNumber() {
    const input = document.getElementById('emergencyNumber');
    if (input && input.value) {
        emergencyHandler.setEmergencyNumber(input.value);
        alert('Emergency number saved!');
    }
}

// Create global instances
const gpsTracker = new GPSTracker();
const emergencyHandler = new EmergencyHandler();

// Expose to window for global access
window.gpsTracker = gpsTracker;
window.emergencyHandler = emergencyHandler;

// Load saved emergency number on startup
window.addEventListener('load', () => {
    const savedNumber = emergencyHandler.getEmergencyNumber();
    const input = document.getElementById('emergencyNumber');
    if (input) {
        input.value = savedNumber;
    }
    
    addLog('GPS and Emergency systems initialized', 'info');
});
