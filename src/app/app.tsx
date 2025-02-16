import { BrowserRouter } from "react-router-dom";
import { NDKProvider } from "../contexts/NDKContext";
import Main from "./Main";
import { FeedsProvider } from "@/contexts/FeedsContext";

function App() {
  return (
    <NDKProvider>
      <FeedsProvider>
        <BrowserRouter>
          <Main />
        </BrowserRouter>
      </FeedsProvider>
    </NDKProvider>
  );
}

export default App;
