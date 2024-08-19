import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { GlobalContextWrapper } from "./GlobalContextProvider.tsx";
import { LoadedUserProvider } from "./LoadedUserContextProvider.tsx"

ReactDOM.createRoot(document.getElementById("root")!).render(<LoadedUserProvider>
                                                                <GlobalContextWrapper>
                                                                    <App />
                                                                </GlobalContextWrapper>
                                                            </LoadedUserProvider>);
