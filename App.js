import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import { BleManager } from "react-native-ble-plx";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";

// Initialize the Bluetooth manager
const manager = new BleManager();

// Function to determine the signal strength based on RSSI value
const getSignalStrength = (rssi) => {
  if (rssi >= -60) return "Excellent";
  if (rssi >= -70) return "Good";
  return "Poor";
};

export default function App() {
  const [devices, setDevices] = useState({});
  const [scanning, setScanning] = useState(false);

  // Effect to handle Bluetooth state changes
  useEffect(() => {
    const subscription = manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        checkPermissions();
      } else {
        Alert.alert("Turn On the Bluetooth");
      }
    }, true);

    // Clean up the subscription on component unmount
    return () => subscription.remove();
  }, []);

  // Effect to handle scanning intervals
  useEffect(() => {
    let signalInterval, refreshInterval;

    if (scanning) {
      signalInterval = setInterval(updateSignalStrength, 2000); // Update RSSI every 2 seconds
      refreshInterval = setInterval(refreshDeviceList, 5000); // Refresh device list every 5 seconds
    } else {
      clearInterval(signalInterval);
      clearInterval(refreshInterval);
    }

    // Clean up intervals on component unmount or when scanning stops
    return () => {
      clearInterval(signalInterval);
      clearInterval(refreshInterval);
    };
  }, [scanning]);

  // Function to check and request Bluetooth permissions
  const checkPermissions = async () => {
    try {
      const permissionStatus = await requestBluetoothPermission();
      if (permissionStatus === RESULTS.GRANTED) {
        scanAndConnect();
      } else {
        console.log("Bluetooth permission not granted");
      }
    } catch (error) {
      console.log("Error requesting Bluetooth permissions:", error);
    }
  };

  // Function to request Bluetooth permissions based on the platform
  const requestBluetoothPermission = async () => {
    try {
      const result = await request(
        Platform.select({
          ios: PERMISSIONS.IOS.BLUETOOTH,
          android: PERMISSIONS.ANDROID.BLUETOOTH_SCAN, // Adjust as per Android requirement
        })
      );
      return result;
    } catch (error) {
      console.error("Error requesting Bluetooth permission:", error);
      return RESULTS.DENIED;
    }
  };

  // Function to start scanning
  const scanAndConnect = () => {
    if (scanning) return;

    setScanning(true);

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("Scan error:", error);
        setScanning(false);
        return;
      }

      // Update devices state with the new device
      setDevices((prevDevices) => ({
        ...prevDevices,
        [device.id]: {
          id: device.id,
          name: device.name || "Unknown",
          rssi: device.rssi,
          strength: getSignalStrength(device.rssi),
          lastUpdated: Date.now(),
        },
      }));
    });
  };

  const updateSignalStrength = () => {
    Object.keys(devices).forEach((deviceId) => {
      manager
        .readRSSIForDevice(deviceId)
        .then((device) => {
          setDevices((prevDevices) => ({
            ...prevDevices,
            [deviceId]: {
              ...prevDevices[deviceId],
              rssi: device.rssi,
              strength: getSignalStrength(device.rssi),
              lastUpdated: Date.now(),
            },
          }));
        })
        .catch((error) => {
          console.log(`Error reading RSSI for device ${deviceId}:`, error);
        });
    });
  };

  // Function to refresh the device list, removing old devices
  const refreshDeviceList = () => {
    const currentTime = Date.now();
    setDevices((prevDevices) => {
      const updatedDevices = { ...prevDevices };
      Object.keys(updatedDevices).forEach((deviceId) => {
        if (currentTime - updatedDevices[deviceId].lastUpdated > 5000) {
          delete updatedDevices[deviceId];
        }
      });
      return updatedDevices;
    });
  };

  // Function to stop the scan and clear the device list
  const stopScan = () => {
    manager.stopDeviceScan();
    setDevices({});
    setScanning(false);
  };

  // Function to render each device in the list
  const renderDevice = ({ item }) => (
    <View style={styles.device}>
      <Text style={styles.deviceName}>{item.name}</Text>
      <Text style={styles.deviceRssi}>RSSI: {item.rssi}</Text>
      <Text style={styles.deviceRssi}>ID: {item.id}</Text>

      <Text
        style={[
          styles.deviceStrength,
          {
            color:
              item.strength === "Excellent"
                ? "green"
                : item.strength === "Good"
                ? "orange"
                : "red",
          },
        ]}
      >
        Signal: {item.strength}
      </Text>
      <Text style={styles.lastUpdated}>
        Last updated: {new Date(item.lastUpdated).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: scanning ? "red" : "green" }]}
        onPress={scanning ? stopScan : checkPermissions}
      >
        <Text style={styles.buttonText}>
          {scanning ? "Stop Scan" : "Start Scan"}
        </Text>
      </TouchableOpacity>
      {scanning && <Text style={styles.scanningText}>Scanning...</Text>}
      {scanning && (
        <FlatList
          data={Object.values(devices)}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.deviceList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
    paddingTop: 50,
  },
  device: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    width: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    marginHorizontal: 10,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  deviceRssi: {
    fontSize: 14,
    color: "#666",
  },
  deviceStrength: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
  },
  lastUpdated: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
  },
  scanningText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  deviceList: {
    paddingBottom: 20,
  },
});
