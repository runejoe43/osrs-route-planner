import '../style/App.css'
import { Box } from '@mantine/core';
import { useEffect } from 'react';
import OSRSMap from '../components/map/OSRSMap';
import { useQuestActions } from '../stores/questStore';
import type { QuestData } from '../types/QuestData';

const questModules = import.meta.glob<{ default: QuestData }>(
  "../../public/data/quests/*.json",
  { eager: false }
);

function App() {
  const { addQuest } = useQuestActions();

  useEffect(() => {
    const load = async () => {    
      for (const loadMod of Object.values(questModules)) {
        const mod = await loadMod();
        addQuest(mod.default as QuestData);
      }
    };
    load();
  }, []);

  return (
    <Box h="100%" w="100%">
      <OSRSMap />
    </Box>
  );
}

export default App;
