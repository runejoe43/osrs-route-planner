import MapLayerToggles from "../map/MapLayerToggles";
import QuestViewer from "../draggable/QuestViewer";
import RouteViewer from "../draggable/RouteViewer";

export default function OverlayLayer() {
  return (
    <>
      <MapLayerToggles />
      <RouteViewer />
      <QuestViewer />
    </>
  );
}
