import { useCallback, useEffect, useRef, useState } from "react";
import SunCalc from "suncalc";
import { CiLocationArrow1 } from "react-icons/ci";

import "./App.css";

function App() {
  const cameraRef = useRef(null);
  const [moonPos, setMoonPos] = useState(null);
  const [userLocation, setUserLocation] = useState({ lat: null, long: null });
  const [deviceAlpha, setDeviceAlpha] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [rotation, setRotation] = useState(0);

  const getUserLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      return setUserLocation({
        lat: pos.coords.latitude,
        long: pos.coords.longitude,
      });
    });
  };

  const updateMoonPosition = useCallback(() => {
    const moon = SunCalc.getMoonPosition(
      new Date(),
      userLocation.lat,
      userLocation.long
    );

    setMoonPos(moon);
  }, [userLocation.lat, userLocation.long]);

  const getDeviceOrientation = () => {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission();
    }
    window.addEventListener("deviceorientation", (e) => {
      setDeviceAlpha(e.alpha);
    });
  };

  const updatePointer = useCallback(() => {
    if (!moonPos || deviceAlpha === null) {
      return;
    }

    // Convert azimuth (radians) to compass bearing (degrees from north, clockwise)
    let moonAzimuthDeg = (moonPos.azimuth * 180) / Math.PI; // radians to degrees
    moonAzimuthDeg = (moonAzimuthDeg + 180) % 360; // south to north

    // deviceAlpha is degrees from north (0-360)
    const diff = (moonAzimuthDeg - deviceAlpha + 360) % 360;
    setRotation(diff);
  }, [moonPos, deviceAlpha]);

  // Get user location and device orientation once on mount
  useEffect(() => {
    getUserLocation();
    getDeviceOrientation();
    getUserLocation();
    updateMoonPosition();
    getDeviceCamera();
  }, [updateMoonPosition]);

  // Update moon position when user location changes
  useEffect(() => {
    if (userLocation.lat !== null && userLocation.long !== null) {
      updateMoonPosition();
    }
  }, [userLocation, updateMoonPosition]);

  // Update pointer when moon position or device alpha changes
  useEffect(() => {
    updatePointer();
  }, [moonPos, deviceAlpha, updatePointer]);

  const getDeviceCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
      }
    } catch (err) {
      setErrorMessage("Enable access to continue");
    }
  };

  return (
    <div className="App">
      <div
        style={{ fontSize: "2rem", color: "#000" }}
      >{`alpha: ${deviceAlpha}, moon: ${moonPos?.azimuth}, user: ${userLocation?.lat}
       ${userLocation?.long}, rotation:${rotation}`}</div>
      {errorMessage && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            fontSize: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Display the feed from the user's camera */}
      <video
        autoPlay
        playsInline
        ref={cameraRef}
        style={{
          position: "absolute",
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          zIndex: 0,
          left: 0,
        }}
      />

      {/* Points towards the moon direction */}
      <div
        id="pointer"
        style={{
          position: "absolute",
          bottom: "50%",
          left: "50%",
          background: "none",
          pointerEvents: "none",
          zIndex: 10,
          transform: `translate(-50%,-50%) rotate(${rotation}deg)`,
        }}
      >
        <CiLocationArrow1 size={60} />
      </div>

      {/* Simulate on desktop with a scroller */}
      {!navigator.userAgentData.mobile && (
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff8",
            padding: 16,
            borderRadius: 8,
          }}
        >
          <label htmlFor="alpha-slider">
            Simulate Compass Heading:{" "}
            {deviceAlpha !== null ? Math.round(deviceAlpha) : 0}°
          </label>
          <input
            id="alpha-slider"
            type="range"
            min="0"
            max="359"
            value={deviceAlpha !== null ? deviceAlpha : 0}
            onChange={(e) => {
              window.isSimulatingAlpha = true;
              setDeviceAlpha(Number(e.target.value));
            }}
            style={{ width: 800 }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
