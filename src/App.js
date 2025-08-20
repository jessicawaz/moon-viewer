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
  const [cameraStarted, setCameraStarted] = useState(false);
  const [moonVisibilityTimes, setMoonVisibilityTimes] = useState({
    rise: null,
    set: null,
  });

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
    let moonAzimuthDeg = (moonPos.azimuth * 180) / Math.PI;
    moonAzimuthDeg = (moonAzimuthDeg + 180) % 360;

    // Calculate shortest angle difference, normalized to [-180, 180]
    let diff = moonAzimuthDeg - deviceAlpha;
    diff = ((diff + 540) % 360) - 180;
    setRotation(diff);
  }, [moonPos, deviceAlpha]);

  const updateMoonVisibility = useCallback(() => {
    const moonSetRiseTimes = SunCalc.getMoonTimes(
      new Date(),
      userLocation.lat,
      userLocation.long
    );

    setMoonVisibilityTimes({
      rise: moonSetRiseTimes.rise,
      set: moonSetRiseTimes.set,
    });
  }, [userLocation.lat, userLocation.long]);

  // Get user location and device orientation once on mount
  useEffect(() => {
    getUserLocation();
    getDeviceOrientation();
    updateMoonPosition();
    updateMoonVisibility();
    // Only start camera if user has pressed the button
    if (cameraStarted) {
      getDeviceCamera();
    }
  }, [updateMoonPosition, cameraStarted, updateMoonVisibility]);

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
      setErrorMessage("Enable access to camera");
    }
  };
  const dateLocales = "en-US";
  const dateOptions = {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  };

  return (
    <div className="App">
      <div
        style={{
          position: "absolute",
          top: 50,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "2rem",
          zIndex: 1000,
        }}
      >
        lat: {userLocation.lat} <br/>
        long: {userLocation.long}
      </div>

      <div
        style={{
          position: "absolute",
          top: 90,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "1rem",
          zIndex: 1000,
        }}
      >
        {moonVisibilityTimes.rise && moonVisibilityTimes.set
          ? `The Moon will be visible from
        ${moonVisibilityTimes.rise?.toLocaleString(dateLocales, dateOptions)} to
        ${moonVisibilityTimes.set?.toLocaleString(
          dateLocales,
          dateOptions
        )} (Eastern)`
          : moonVisibilityTimes.rise && !moonVisibilityTimes.set
          ? `The Moon will be visible starting at ${moonVisibilityTimes.rise?.toLocaleString(
              dateLocales,
              dateOptions
            )} (Eastern)`
          : !moonVisibilityTimes.rise && moonVisibilityTimes.set
          ? `The Moon is visible now through ${moonVisibilityTimes.set?.toLocaleString(
              dateLocales,
              dateOptions
            )} (Eastern)`
          : "The moon will not be visible tonight."}
      </div>

      {errorMessage && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            fontSize: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100dvw",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Display the feed from the user's camera */}
      {cameraStarted ? (
        <video
          autoPlay
          playsInline
          ref={cameraRef}
          style={{
            position: "absolute",
            width: "100dvw",
            height: "100dvh",
            objectFit: "cover",
            zIndex: 0,
            left: 0,
          }}
        />
      ) : (
        <button
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "1rem",
            padding: "1rem 2rem",
            zIndex: 1000,
            background: "#222",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            boxShadow: "0 2px 8px #0008",
          }}
          onClick={() => setCameraStarted(true)}
        >
          Start Camera
        </button>
      )}

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
    </div>
  );
}

export default App;
