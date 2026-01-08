// Alert Handler Module
class AlertHandler {
    constructor() {
        this.isAlertActive = false;
        this.countdownTimer = null;
        this.countdownSeconds = 30;
        this.currentSeverity = 'medium';
        this.alertDetails = {};
        this.voiceRecognition = null;
        this.shakeDetection = null;
        this.alertAudioContext = null;
        this.beepInterval = null;
    }

    showAlert(severity, details) {
        if (this.isAlertActive) return;

        this.isAlertActive = true;
        this.currentSeverity = severity;
        this.alertDetails = details;

        // Determine countdown time based on severity
        this.countdownSeconds = this.getCountdownTime(severity);

        // Show alert screen
        this.switchScreen('alertScreen');

        // Update alert information
        this.updateAlertDisplay(severity, details);

        // Get current location
        this.updateLocation();

        // Start countdown
        this.startCountdown();

        // Start voice recognition
        this.startVoiceRecognition();

        // Start shake detection
        this.startShakeDetection();

        // Play alert sound
        this.playAlertSound();

        // Start continuous beeping
        this.startContinuousBeeping();

        // Vibrate device
        this.vibrateDevice();

        addLog(`Alert triggered - Severity: ${severity}`, 'error');
    }

    getCountdownTime(severity) {
        const times = {
            'low': 60,
            'medium': 30,
            'high': 20,
            'critical': 15
        };
        return times[severity] || 30;
    }

    updateAlertDisplay(severity, details) {
        const severityText = {
            'medium': 'Medium Severity Incident',
            'high': 'High Severity Accident',
            'critical': 'CRITICAL ACCIDENT'
        };

        document.getElementById('alertSeverity').textContent = severityText[severity];
        document.getElementById('countdownNumber').textContent = this.countdownSeconds;
    }

    async updateLocation() {
        const locationElement = document.getElementById('alertLocation');
        
        try {
            const position = await gpsTracker.getCurrentPosition();
            const locationText = `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`;
            locationElement.textContent = locationText;
            this.alertDetails.location = position;
        } catch (error) {
            locationElement.textContent = 'Location unavailable';
        }
    }

    startCountdown() {
        const countdownNumber = document.getElementById('countdownNumber');
        const countdownCircle = document.getElementById('countdownCircle');
        const circumference = 2 * Math.PI * 90; // radius = 90
        
        let timeLeft = this.countdownSeconds;

        this.countdownTimer = setInterval(() => {
            // Update display
            countdownNumber.textContent = Math.max(0, timeLeft);

            // Update circle progress (if circle exists)
            if (countdownCircle) {
                const offset = circumference - (Math.max(0, timeLeft) / this.countdownSeconds) * circumference;
                countdownCircle.style.strokeDashoffset = offset;
            }

            // Play more urgent beeps when countdown is low
            if (timeLeft <= 10 && timeLeft > 0) {
                this.playUrgentBeep();
                // Vibrate more frequently
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
            }

            // Final warning at 5 seconds
            if (timeLeft === 5) {
                addLog('⚠️ WARNING: 5 seconds remaining!', 'error');
            }

            // Decrement time
            timeLeft--;

            // When time reaches zero or below, send alert
            if (timeLeft < 0) {
                addLog('⏰ Countdown reached zero!', 'error');
                this.clearCountdown();
                this.sendEmergencyAlert();
                return; // Exit to prevent further execution
            }
        }, 1000);
    }

    clearCountdown() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    cancelAlert() {
        addLog('Alert cancelled by user', 'info');
        
        this.clearCountdown();
        this.stopVoiceRecognition();
        this.stopShakeDetection();
        this.stopContinuousBeeping();
        this.isAlertActive = false;

        // Return to dashboard
        this.switchScreen('dashboard');

        // Reset detection
        setTimeout(() => {
            accidentDetector.lastImpactTime = 0;
        }, 5000);
    }

    startVoiceRecognition() {
        // Check if browser supports speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.log('Speech recognition not supported');
            return;
        }

        this.voiceRecognition = new SpeechRecognition();
        this.voiceRecognition.continuous = true;
        this.voiceRecognition.interimResults = true;
        this.voiceRecognition.lang = 'en-US';

        this.voiceRecognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('')
                .toLowerCase();

            // Check for cancel keywords
            const cancelKeywords = [
                'cancel', 'stop', 'okay', 'ok', "i'm okay", 
                "i'm ok", 'fine', "i'm fine", 'safe', "i'm safe",
                'no emergency', 'false alarm', 'mistake'
            ];

            for (let keyword of cancelKeywords) {
                if (transcript.includes(keyword)) {
                    addLog(`Voice command detected: "${transcript}"`, 'info');
                    this.cancelAlert();
                    break;
                }
            }
        };

        this.voiceRecognition.onerror = (event) => {
            console.log('Voice recognition error:', event.error);
        };

        try {
            this.voiceRecognition.start();
            addLog('Voice recognition activated', 'info');
        } catch (error) {
            console.log('Could not start voice recognition:', error);
        }
    }

    stopVoiceRecognition() {
        if (this.voiceRecognition) {
            try {
                this.voiceRecognition.stop();
            } catch (error) {
                console.log('Error stopping voice recognition:', error);
            }
            this.voiceRecognition = null;
        }
    }

    startShakeDetection() {
        let lastShakeTime = 0;
        const shakeThreshold = 15; // g-force threshold for shake
        const shakeTimeout = 500; // ms between shakes

        this.shakeDetection = (event) => {
            const accel = event.accelerationIncludingGravity;
            if (!accel) return;

            const magnitude = Math.sqrt(
                Math.pow(accel.x || 0, 2) +
                Math.pow(accel.y || 0, 2) +
                Math.pow(accel.z || 0, 2)
            );

            const gForce = magnitude / 9.81;
            const currentTime = Date.now();

            if (gForce > shakeThreshold && (currentTime - lastShakeTime) > shakeTimeout) {
                lastShakeTime = currentTime;
                addLog('Shake gesture detected', 'info');
                this.cancelAlert();
            }
        };

        window.addEventListener('devicemotion', this.shakeDetection);
    }

    stopShakeDetection() {
        if (this.shakeDetection) {
            window.removeEventListener('devicemotion', this.shakeDetection);
            this.shakeDetection = null;
        }
    }

    playAlertSound() {
        // Create initial alert sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; // Hz
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

            // Play intermittent beeps
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.frequency.value = 1000;
                osc2.type = 'sine';
                gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
                osc2.start();
                osc2.stop(audioContext.currentTime + 0.2);
            }, 300);
        } catch (error) {
            console.log('Could not play alert sound:', error);
        }
    }

    startContinuousBeeping() {
        // Play beep sound every 2 seconds during countdown
        this.beepInterval = setInterval(() => {
            this.playBeep();
        }, 2000);
        
        // Play first beep immediately
        this.playBeep();
    }

    stopContinuousBeeping() {
        if (this.beepInterval) {
            clearInterval(this.beepInterval);
            this.beepInterval = null;
        }
        
        // Close audio context if exists
        if (this.alertAudioContext) {
            this.alertAudioContext.close();
            this.alertAudioContext = null;
        }
    }

    playBeep() {
        try {
            if (!this.alertAudioContext) {
                this.alertAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.alertAudioContext.createOscillator();
            const gainNode = this.alertAudioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.alertAudioContext.destination);

            oscillator.frequency.value = 900; // Hz
            oscillator.type = 'square';

            // Envelope for beep
            const now = this.alertAudioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            oscillator.start(now);
            oscillator.stop(now + 0.3);
        } catch (error) {
            console.log('Could not play beep:', error);
        }
    }

    playUrgentBeep() {
        // Play more urgent beeps when countdown is low
        try {
            if (!this.alertAudioContext) {
                this.alertAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.alertAudioContext.createOscillator();
            const gainNode = this.alertAudioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.alertAudioContext.destination);

            oscillator.frequency.value = 1200; // Higher pitch for urgency
            oscillator.type = 'sawtooth';

            const now = this.alertAudioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            oscillator.start(now);
            oscillator.stop(now + 0.2);
        } catch (error) {
            console.log('Could not play urgent beep:', error);
        }
    }

    vibrateDevice() {
        // Vibrate in a pattern: [vibrate, pause, vibrate, pause, ...]
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
    }

    sendEmergencyAlert() {
        addLog('No response from user - sending emergency alert', 'error');
        
        this.clearCountdown();
        this.stopVoiceRecognition();
        this.stopShakeDetection();
        this.stopContinuousBeeping();
        this.isAlertActive = false;

        // Ensure emergency handler exists
        if (typeof emergencyHandler === 'undefined' || !emergencyHandler) {
            addLog('ERROR: Emergency handler not available!', 'error');
            alert('⚠️ Emergency system error! Please call emergency services manually.');
            return;
        }

        try {
            // Send emergency notification
            addLog('Calling emergencyHandler.sendAlert...', 'info');
            emergencyHandler.sendAlert(this.currentSeverity, this.alertDetails);
            addLog('Emergency alert sent successfully', 'info');
            
            // Show emergency sent screen
            this.switchScreen('emergencyScreen');
        } catch (error) {
            addLog(`Failed to send emergency alert: ${error.message}`, 'error');
            alert('⚠️ Failed to send emergency alert! Please call emergency services manually.');
            console.error('Emergency send error:', error);
        }
    }

    switchScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        document.getElementById(screenId).classList.add('active');
    }
}

// Global functions for button handlers
function cancelAlert() {
    if (window.alertHandler) {
        window.alertHandler.cancelAlert();
    }
}

function callEmergencyNow() {
    if (window.alertHandler) {
        addLog('User requested immediate emergency assistance', 'error');
        window.alertHandler.sendEmergencyAlert();
    }
}

function returnToDashboard() {
    if (window.alertHandler) {
        window.alertHandler.switchScreen('dashboard');
    }
}

// Create global instance
window.alertHandler = new AlertHandler();
