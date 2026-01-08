// Sensor Management Module
class SensorManager {
    constructor() {
        this.accelerometer = null;
        this.gyroscope = null;
        this.isMonitoring = false;
        this.baselineAccel = { x: 0, y: 0, z: 9.81 };
        this.sensorData = {
            acceleration: { x: 0, y: 0, z: 0 },
            rotation: { alpha: 0, beta: 0, gamma: 0 },
            impactForce: 0,
            maxImpact: 0
        };
        this.callbacks = [];
    }

    async requestPermissions() {
        try {
            addLog('📱 Requesting motion sensor permissions...', 'info');
            
            // Request motion sensor permissions (for iOS 13+)
            if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
                addLog('iOS device detected - requesting motion permission', 'info');
                const permissionState = await DeviceMotionEvent.requestPermission();
                if (permissionState !== 'granted') {
                    addLog('❌ Motion sensor permission denied', 'error');
                    throw new Error('Motion sensor permission denied');
                }
                addLog('✅ Motion sensor permission granted', 'info');
            }

            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                addLog('Requesting orientation permission', 'info');
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState !== 'granted') {
                    addLog('❌ Orientation sensor permission denied', 'error');
                    throw new Error('Orientation sensor permission denied');
                }
                addLog('✅ Orientation sensor permission granted', 'info');
            }

            addLog('✅ All motion permissions granted!', 'info');
            return true;
        } catch (error) {
            addLog(`❌ Permission error: ${error.message}`, 'error');
            console.error('Permission error:', error);
            return false;
        }
    }

    startMonitoring(callback) {
        if (this.isMonitoring) {
            addLog('Sensor monitoring already active', 'info');
            return;
        }

        this.isMonitoring = true;
        if (callback) this.callbacks.push(callback);

        addLog('🔄 Starting sensor monitoring...', 'info');

        // Monitor device motion (accelerometer)
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', this.handleMotion.bind(this));
            if (typeof updateSensorStatus === 'function') {
                updateSensorStatus('accelStatus', true);
            }
            addLog('✅ Accelerometer monitoring started', 'info');
        } else {
            addLog('⚠️ Accelerometer not supported', 'warning');
        }

        // Monitor device orientation (gyroscope)
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
            if (typeof updateSensorStatus === 'function') {
                updateSensorStatus('gyroStatus', true);
            }
            addLog('✅ Gyroscope monitoring started', 'info');
        } else {
            addLog('⚠️ Gyroscope not supported', 'warning');
        }

        // Calibrate baseline
        this.calibrate();
    }

    stopMonitoring() {
        this.isMonitoring = false;
        window.removeEventListener('devicemotion', this.handleMotion.bind(this));
        window.removeEventListener('deviceorientation', this.handleOrientation.bind(this));
        
        updateSensorStatus('accelStatus', false);
        updateSensorStatus('gyroStatus', false);
        
        addLog('Sensor monitoring stopped', 'info');
    }

    handleMotion(event) {
        if (!this.isMonitoring) return;

        const accel = event.accelerationIncludingGravity;
        if (!accel) return;

        // Store current acceleration
        this.sensorData.acceleration = {
            x: accel.x || 0,
            y: accel.y || 0,
            z: accel.z || 0
        };

        // Calculate impact force (total acceleration magnitude)
        const magnitude = Math.sqrt(
            Math.pow(accel.x || 0, 2) +
            Math.pow(accel.y || 0, 2) +
            Math.pow(accel.z || 0, 2)
        );

        // Convert to g-force (1 g = 9.81 m/s²)
        this.sensorData.impactForce = magnitude / 9.81;

        // Track maximum impact
        if (this.sensorData.impactForce > this.sensorData.maxImpact) {
            this.sensorData.maxImpact = this.sensorData.impactForce;
        }

        // Update UI
        document.getElementById('impactForce').textContent = 
            this.sensorData.impactForce.toFixed(2) + ' g';

        // Notify callbacks of sensor data
        this.notifyCallbacks();
    }

    handleOrientation(event) {
        if (!this.isMonitoring) return;

        this.sensorData.rotation = {
            alpha: event.alpha || 0,  // Z-axis rotation (0-360)
            beta: event.beta || 0,    // X-axis rotation (-180 to 180)
            gamma: event.gamma || 0   // Y-axis rotation (-90 to 90)
        };

        // Detect sudden rotation changes (could indicate a crash/flip)
        // This will be used in the detection algorithm
        this.notifyCallbacks();
    }

    calibrate() {
        addLog('Calibrating sensors...', 'info');
        setTimeout(() => {
            this.sensorData.maxImpact = 0;
            addLog('Sensor calibration complete', 'info');
        }, 2000);
    }

    notifyCallbacks() {
        this.callbacks.forEach(callback => {
            callback(this.sensorData);
        });
    }

    getSensorData() {
        return this.sensorData;
    }
}

// Audio Monitoring Module
class AudioMonitor {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.isMonitoring = false;
        this.soundLevel = 0;
        this.peakLevel = 0;
        this.callbacks = [];
    }

    async requestPermissions() {
        try {
            addLog('🎤 Requesting microphone permission...', 'info');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the test stream
            stream.getTracks().forEach(track => track.stop());
            addLog('✅ Microphone permission granted!', 'info');
            return true;
        } catch (error) {
            addLog(`❌ Microphone permission denied: ${error.message}`, 'error');
            console.error('Microphone permission denied:', error);
            return false;
        }
    }

    async startMonitoring(callback) {
        if (this.isMonitoring) {
            addLog('Microphone monitoring already active', 'info');
            return;
        }

        try {
            addLog('🔄 Starting microphone monitoring...', 'info');
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            // Get microphone stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);

            this.isMonitoring = true;
            if (callback) this.callbacks.push(callback);

            if (typeof updateSensorStatus === 'function') {
                updateSensorStatus('micStatus', true);
            }
            addLog('✅ Microphone monitoring ACTIVE', 'info');

            // Start analyzing audio
            this.analyzeAudio();

        } catch (error) {
            addLog('Microphone access failed: ' + error.message, 'error');
            updateSensorStatus('micStatus', false);
        }
    }

    stopMonitoring() {
        this.isMonitoring = false;

        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        updateSensorStatus('micStatus', false);
        addLog('Microphone monitoring stopped', 'info');
    }

    analyzeAudio() {
        if (!this.isMonitoring) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        // Calculate average sound level
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;

        // Convert to decibels (approximate)
        this.soundLevel = Math.round(average);

        // Track peak level
        if (this.soundLevel > this.peakLevel) {
            this.peakLevel = this.soundLevel;
        }

        // Update UI
        document.getElementById('soundLevel').textContent = this.soundLevel + ' dB';

        // Notify callbacks
        this.callbacks.forEach(callback => {
            callback({
                level: this.soundLevel,
                peak: this.peakLevel
            });
        });

        // Continue analyzing
        requestAnimationFrame(() => this.analyzeAudio());
    }

    getSoundLevel() {
        return {
            current: this.soundLevel,
            peak: this.peakLevel
        };
    }

    resetPeak() {
        this.peakLevel = 0;
    }
}

// Helper functions
function updateSensorStatus(elementId, isActive) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = isActive ? 'Active' : 'Off';
        element.className = isActive ? 'status-badge active' : 'status-badge inactive';
        console.log(`Sensor status updated: ${elementId} = ${isActive ? 'Active' : 'Off'}`);
    } else {
        console.warn(`Element not found: ${elementId}`);
    }
}

// Export instances
const sensorManager = new SensorManager();
const audioMonitor = new AudioMonitor();
