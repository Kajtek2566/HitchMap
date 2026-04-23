import type { ImageRequireSource } from "react-native";

const SPOT_MARKER_IMAGES = {
  gray: require("@/assets/markers/spot-gray.png") as ImageRequireSource,
  green: require("@/assets/markers/spot-green.png") as ImageRequireSource,
  lime: require("@/assets/markers/spot-lime.png") as ImageRequireSource,
  orange: require("@/assets/markers/spot-orange.png") as ImageRequireSource,
  red: require("@/assets/markers/spot-red.png") as ImageRequireSource,
  yellow: require("@/assets/markers/spot-yellow.png") as ImageRequireSource,
};

export const getSpotMarkerImage = (rating: number | null) => {
  if (rating === null) return SPOT_MARKER_IMAGES.gray;
  if (rating >= 5) return SPOT_MARKER_IMAGES.green;
  if (rating >= 4) return SPOT_MARKER_IMAGES.lime;
  if (rating >= 3) return SPOT_MARKER_IMAGES.yellow;
  if (rating >= 2) return SPOT_MARKER_IMAGES.orange;
  return SPOT_MARKER_IMAGES.red;
};
