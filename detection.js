// Accident Detection Algorithm
class AccidentDetector {
    constructor() {
        this.isActive = false;
        this.detectionThresholds = {
            // Impact force thresholds (in g-force)
            lowImpact: 2.5,      // 2.5g - minor bump
            mediumImpact: 4.0,   // 4.0g - moderate impact
            highImpact: 6.0,     // 6.0g - severe impact
            criticalImpact: 8.0, // 8.0g - critical impact

            // Sound level thresholds (approximate dB)
            crashSoundLevel: 100,  // Loud crash/collision sound
            
            // Rotation thresholds (degrees per check)
            suddenRotation: 45,

            // Sustained high force duration (ms)
            sustainedForceDuration: 200
        };

        this.detectionHistory = [];
        this.lastImpactTime = 0;
        this.highForceStartTime = 0;
        this.sustainedHighForce = false;
    }

    start() {
        this.isActive = true;
        this.detectionHistory = [];
        
        // Start monitoring sensors
        sensorManager.startMonitoring((sensorData) => {
            this.analyzeSensorData(sensorData);
        });

        audioMonitor.startMonitoring((audioData) => {
            this.analyzeAudioData(audioData);
        });

        addLog('Accident detection algorithm activated', 'info');
    }

    stop() {
        this.isActive = false;
        addLog('Accident detection algorithm deactivated', 'info');
    }

    analyzeSensorData(sensorData) {
        if (!this.isActive) return;

        const currentTime = Date.now();
        const impactForce = sensorData.impactForce;

        // Check for sudden high impact
        if (impactForce >= this.detectionThresholds.lowImpact) {
            // Track sustained high force
            if (!this.sustainedHighForce) {
                this.highForceStartTime = currentTime;
                this.sustainedHighForce = true;
            }

            // Check if high force is sustained
            const forceDuration = currentTime - this.highForceStartTime;
            
            // Determine severity based on impact force and duration
            let severity = this.calculateSeverity(impactForce, forceDuration);

            // Add to detection history
            this.addDetectionEvent({
                type: 'impact',
                severity: severity,
                force: impactForce,
                duration: forceDuration,
                timestamp: currentTime
            });

            // Trigger alert if threshold exceeded
            if (severity !== 'none') {
                this.triggerAccidentAlert(severity, {
                    impactForce: impactForce,
                    duration: forceDuration
                });
            }
        } else {
            this.sustainedHighForce = false;
        }

        // Check for sudden rotation (possible rollover)
        this.checkRotationAnomaly(sensorData.rotation);
    }

    analyzeAudioData(audioData) {
        if (!this.isActive) return;

        // Detect loud crash sounds
        if (audioData.level >= this.detectionThresholds.crashSoundLevel) {
            const currentTime = Date.now();

            // Avoid duplicate detections within 5 seconds
            if (currentTime - this.lastImpactTime > 5000) {
                addLog(`Loud crash sound detected: ${audioData.level} dB`, 'warning');
                
                // Check if there's also a recent impact force
                const recentImpact = this.hasRecentImpact(currentTime, 2000);
                
                if (recentImpact) {
                    // Sound + Impact = Higher confidence of accident
                    const severity = this.calculateCombinedSeverity(recentImpact, audioData.level);
                    
                    this.addDetectionEvent({
                        type: 'combined',
                        severity: severity,
                        soundLevel: audioData.level,
                        timestamp: currentTime
                    });

                    this.triggerAccidentAlert(severity, {
                        soundLevel: audioData.level,
                        combined: true
                    });
                }
            }
        }
    }

    checkRotationAnomaly(rotation) {
        // Store previous rotation for comparison
        if (!this.previousRotation) {
            this.previousRotation = rotation;
            return;
        }

        // Calculate rotation delta
        const deltaAlpha = Math.abs(rotation.alpha - this.previousRotation.alpha);
        const deltaBeta = Math.abs(rotation.beta - this.previousRotation.beta);
        const deltaGamma = Math.abs(rotation.gamma - this.previousRotation.gamma);

        // Check for sudden large rotation (possible vehicle flip/rollover)
        if (deltaBeta > this.detectionThresholds.suddenRotation || 
            deltaGamma > this.detectionThresholds.suddenRotation) {
            
            addLog('Sudden rotation detected - possible rollover', 'warning');
            
            // This could indicate a rollover accident
            this.addDetectionEvent({
                type: 'rotation',
                severity: 'high',
                deltaBeta: deltaBeta,
                deltaGamma: deltaGamma,
                timestamp: Date.now()
            });
        }

        this.previousRotation = rotation;
    }

    calculateSeverity(impactForce, duration) {
        const t = this.detectionThresholds;

        // Critical: Very high force or sustained high force
        if (impactForce >= t.criticalImpact || 
            (impactForce >= t.highImpact && duration >= t.sustainedForceDuration)) {
            return 'critical';
        }

        // High: Significant impact
        if (impactForce >= t.highImpact) {
            return 'high';
        }

        // Medium: Moderate impact
        if (impactForce >= t.mediumImpact) {
            return 'medium';
        }

        // Low: Minor impact
        if (impactForce >= t.lowImpact) {
            return 'low';
        }

        return 'none';
    }

    calculateCombinedSeverity(impactEvent, soundLevel) {
        // Combine impact force and sound level for better accuracy
        let severity = impactEvent.severity;

        // Upgrade severity if loud sound confirms impact
        if (soundLevel >= this.detectionThresholds.crashSoundLevel) {
            if (severity === 'medium') severity = 'high';
            if (severity === 'low') severity = 'medium';
        }

        return severity;
    }

    hasRecentImpact(currentTime, timeWindow) {
        // Check if there was an impact within the time window
        for (let i = this.detectionHistory.length - 1; i >= 0; i--) {
            const event = this.detectionHistory[i];
            if (currentTime - event.timestamp <= timeWindow && event.type === 'impact') {
                return event;
            }
        }
        return null;
    }

    addDetectionEvent(event) {
        this.detectionHistory.push(event);
        
        // Keep only last 50 events
        if (this.detectionHistory.length > 50) {
            this.detectionHistory.shift();
        }

        // Update severity display
        this.updateSeverityDisplay(event.severity);
    }

    updateSeverityDisplay(severity) {
        const severityElement = document.getElementById('severityLevel');
        if (severityElement) {
            const severityText = {
                'none': 'None',
                'low': '⚠️ Low',
                'medium': '⚠️ Medium',
                'high': '🚨 High',
                'critical': '🚨 CRITICAL'
            };
            severityElement.textContent = severityText[severity] || 'None';
            severityElement.style.color = severity === 'critical' || severity === 'high' ? '#ef4444' : '#333';
        }
    }

    triggerAccidentAlert(severity, details) {
        const currentTime = Date.now();

        // Avoid multiple alerts within 10 seconds
        if (currentTime - this.lastImpactTime < 10000) {
            return;
        }

        this.lastImpactTime = currentTime;

        // Only trigger alert for medium severity and above
        if (severity === 'low' || severity === 'none') {
            addLog(`${severity} severity impact detected - no alert`, 'warning');
            return;
        }

        addLog(`ACCIDENT DETECTED - Severity: ${severity.toUpperCase()}`, 'error');
        
        // Trigger the alert screen
        if (window.alertHandler) {
            window.alertHandler.showAlert(severity, details);
        }
    }

    getDetectionHistory() {
        return this.detectionHistory;
    }
}

// Export instance
const accidentDetector = new AccidentDetector();
