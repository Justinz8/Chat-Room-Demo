import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import { useEffect, useState } from "react";

import Sidebar from "./components/SideBarComponents/Sidebar";
import PopupAuth from "./components/Popup/PopupAuth";
import ChatWindow from "./components/ChatArea/ChatWindow";
import UsersBar from "./components/UsersBarComponents/UsersBar";

import "./App.css";

function App() {
  const [loggedIn, setLoggedIn] = useState<number>(0);

  /*
    Set the state for signed in based of AuthStateChanged changing from its default value of 0. 
    This is to prevent attempted loading of resources before the state of the page has been 
    properly set
  */
  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoggedIn(1);
      } else {
        setLoggedIn(-1);
      }
    });
  }, []);

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