import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import { useEffect, useState } from "react";
import Sidebar from "./components/SideBarComponents/Sidebar";

import PopupAuth from "./components/Popup/PopupAuth";

import ChatWindow from "./components/ChatArea/ChatWindow";

import { User } from "./interfaces";

import { useSocket } from "./CustomHooks";

import { useFetch } from "./CustomHooks";


import "./App.css";

function App() {
  const [loggedIn, setLoggedIn] = useState<number>(0);

  const [FriendRequests, SetFriendRequests] = useState<User[]>([]);

  const [Friends, SetFriends] = useState<User[]>([]);

  const Fetch = useFetch('http://localhost:3000');

  useEffect(() => {
    console.log("PEEN")
    onAuthStateChanged(auth, (user) => {
      if (user) {
        Fetch('getUserData').then((data) => {
          console.log(data)
          SetFriendRequests(data.requests);
          SetFriends(data.friends);
        });
        setLoggedIn(1);
      } else {
        setLoggedIn(-1);
      }
    });
  }, []);


  //Temp FUnction:
  function TestAddChat() {
    auth.currentUser?.getIdToken().then((token) => {
      fetch("http://localhost:3000/addChat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat: {
            name: "Test Chat",
            members: ["Test User"],
          },
          token: token,
        }),
      }).then((response) => {
        console.log(response);
      });
    });
  }

  const [currentChatID, setCurrentChatID] = useState<string>("");

  const socket = useSocket();
  

  useEffect(() => {
    if (socket) {
      socket.on("connect_error", (err: Error) => {
        console.error(err);
      });

      socket.on("connected", () => {
        if (currentChatID) {
          socket.emit("joinRoom", currentChatID);
        }
      });

      socket.on("FriendRequest", (User: User) => {
        SetFriendRequests((x: User[]) => [...x, User])
      });
    }
  }, [socket]);

  function addFriend(FriendEmail: string) {
    if (socket) {
      socket.emit("AddFriend", { FriendEmail: FriendEmail });
    }
  }

  function setCurrentChat(ID: string) {
    if (currentChatID === ID) return;
    if(socket){
      socket.emit("leaveRoom", currentChatID);
      socket.emit("joinRoom", ID);
    }
    setCurrentChatID(ID);
  }


  function loadFunction() {
    if (loggedIn === 1) {
      return (
        <>
          <Sidebar
            TestAddChat={TestAddChat}
            setCurrentChat={setCurrentChat}
            addFriend={addFriend}
            FriendRequests={FriendRequests}
            Friends={Friends}
          />
          <ChatWindow
            currentChatID={currentChatID}
          />
        </>
      );
    } else if (loggedIn === -1) {
      return <PopupAuth/>;
    }
  }

  return <div className="Main-Wrapper">{loadFunction()}</div>
}


export default App;
