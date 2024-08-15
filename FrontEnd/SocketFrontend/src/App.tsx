import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import { useEffect, useState } from "react";

import Sidebar from "./components/SideBarComponents/Sidebar";
import PopupAuth from "./components/Popup/PopupAuth";
import ChatWindow from "./components/ChatArea/ChatWindow";
import UsersBar from "./components/UsersBarComponents/UsersBar";

import { useSocket } from "./CustomHooks";

import "./App.css";

function App() {
  const [loggedIn, setLoggedIn] = useState<number>(0);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoggedIn(1);
      } else {
        setLoggedIn(-1);
      }
    });
  }, []);

  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on("connect_error", (err: Error) => {
        if(err.message === "Token Error"){
          auth.currentUser?.getIdToken();
        }
        console.error(err);
      });
    }
  }, [socket]);


  function loadFunction() {
    if (loggedIn === 1) {
      return (
        <>
          <Sidebar />
          <ChatWindow/>
          <UsersBar />
        </>
      );
    } else if (loggedIn === -1) {
      return <PopupAuth/>;
    }
  }

  return <div className="Main-Wrapper">{loadFunction()}</div>
}

export default App;