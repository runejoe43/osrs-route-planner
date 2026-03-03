import { useQuestIds } from "../../stores/questStore";
import QuestPin from "./QuestPin";


export default function QuestPins() {
  const questIds = useQuestIds();
  return (
    <>
      {questIds.map(id => <QuestPin key={`marker-${id}`} id={id} />)}
    </>
  );
}