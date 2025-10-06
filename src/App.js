import { useCallback, useEffect, useRef, useState } from "react";
import SunCalc from "suncalc";
import { CiLocationArrow1 } from "react-icons/ci";
import { FaMoon } from "react-icons/fa";

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
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      setUserLocation({ lat: "N/A", long: "N/A" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          long: pos.coords.longitude,
        });
        setErrorMessage(null);
      },
      (err) => {
        let message = '';
        if (err.code === 1) {
          message = 'Location access denied. Please allow location access in your browser settings and reload the page.';
        } else if (err.code === 2) {
          message = 'Location unavailable. Please check your device settings.';
        } else if (err.code === 3) {
          message = 'Location request timed out. Please try again.';
        } else {
          message = 'Unable to retrieve your location. Error: ' + (err.message || String(err));
        }
        setErrorMessage(message);
        setUserLocation({ lat: "N/A", long: "N/A" });
      }
    );
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

  // Get device orientation once on mount
  useEffect(() => {
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
    <div className={"App"}>
      <div className={"MoonLogo"}>
        <FaMoon size={60} />
        <span>Madison's Moon Viewer</span>
      </div>

      <div className={"PageWrapper"}>
        {userLocation?.lat && userLocation?.long ? (
          <div
            style={{
              fontSize: "1.5rem",
              marginBottom: '16px',
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
        ) : (
          <button
            style={{
              fontSize: "1rem",
              padding: "1rem 2rem",
              zIndex: 1000,
              background: "#222",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              boxShadow: "0 2px 8px #0008",
            }}
            onClick={getUserLocation}
          >
            Request Location
          </button>
        )}

        {errorMessage && (
          <div
            style={{
              fontSize: "1.5rem",
              marginTop: 40,
              color: 'red',
              maxWidth: 500,
            }}
          >
            <p>{errorMessage}</p>
            {errorMessage.includes('denied') && (
              <p style={{ fontSize: '1rem', marginTop: 8 }}>
                <strong>Tip:</strong> Check your browser’s site settings to allow location access for <code>moon-viewer.vercel.app</code>.<br />
                You may need to reload the page after changing permissions.<br />
                <a href="https://support.google.com/chrome/answer/142065?hl=en" target="_blank" rel="noopener noreferrer">How to manage location settings</a>
              </p>
            )}
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
              fontSize: "1rem",
              padding: "1rem 2rem",
              zIndex: 1000,
              background: "#222",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              boxShadow: "0 2px 8px #0008",
              marginTop: 8,
            }}
            onClick={() => setCameraStarted(true)}
          >
            Request Camera
          </button>
        )}

        {/* Points towards the moon direction */}
        <div
          id="pointer"
          style={{
            background: "none",
            pointerEvents: "none",
            zIndex: 10,
            marginTop: 40,
          }}
        >
          <CiLocationArrow1 size={60} />
        </div>
      </div>
    </div>
  );
}

export default App;
