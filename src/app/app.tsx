import { BrowserRouter } from "react-router-dom";
import { NDKProvider } from "../contexts/NDKContext";
import Main from "./Main";
import { FeedsProvider } from "@/contexts/FeedsContext";
import { FeedProvider } from "@/context/FeedContext";

function App() {
  const basename = import.meta.env.PROD ? "/composer" : "";
  
  return (
    <NDKProvider>
      <FeedsProvider>
        <FeedProvider>
          <BrowserRouter basename={basename}>
            <Main />
          </BrowserRouter>
        </FeedProvider>
      </FeedsProvider>
    </NDKProvider>
  );
}

export default App;
