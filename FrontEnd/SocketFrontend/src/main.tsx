import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { GlobalContextWrapper } from "./GlobalContextProvider.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(<GlobalContextWrapper><App /></GlobalContextWrapper>);
