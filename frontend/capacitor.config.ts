import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ssa.ambikapur.dormalert",
  appName: "SSA Dormitory Alert",
  webDir: "out",
  server: {
    androidScheme: "http",
    cleartext: true,
  },
};

export default config;
