import { BrowserRouter } from "react-router-dom";
import { NDKProvider } from "../contexts/NDKContext";
import Main from "./Main";
import { FeedsProvider } from "@/contexts/FeedsContext";
import { FeedProvider } from "@/context/FeedContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

function App() {
  const basename = import.meta.env.PROD ? "/composer" : "";
  
  return (
    <ThemeProvider>
      <NDKProvider>
        <FeedsProvider>
          <FeedProvider>
            <BrowserRouter basename={basename}>
              <Main />
            </BrowserRouter>
          </FeedProvider>
        </FeedsProvider>
      </NDKProvider>
    </ThemeProvider>
  );
}

export default App;
