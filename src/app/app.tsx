import { BrowserRouter } from "react-router-dom";
import { NDKProvider } from "../contexts/NDKContext";
import Main from "./Main";
import { FeedsProvider } from "@/contexts/FeedsContext";
import { FeedProvider } from "@/context/FeedContext";

function App() {
  return (
    <NDKProvider>
      <FeedsProvider>
        <FeedProvider>
          <BrowserRouter>
            <Main />
          </BrowserRouter>
        </FeedProvider>
      </FeedsProvider>
    </NDKProvider>
  );
}

export default App;
