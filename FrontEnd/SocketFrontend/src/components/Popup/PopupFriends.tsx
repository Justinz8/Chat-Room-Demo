import "./Friends.css";

import { User } from "../../interfaces";

import React, { useState } from "react";

import { useSocket } from "../../CustomHooks";

interface props{
  addFriend: (FriendEmail: string) => void,
  FriendRequests: User[]
}

export default function PopupFriends(props: props) {
  const [FriendsPopup, SetFriendsPopup] = useState(false);

  const [FriendEmail, SetFriendEmail] = useState("");

  const socket = useSocket();

  function onFriendSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    props.addFriend(FriendEmail);
  }

  function AcceptFriendReq(CurrentFriendReq: string){
    if(socket){
      socket.emit("AcceptFriendReq", CurrentFriendReq);
    }
  }

  const styledRequests = props.FriendRequests.map((x: User) => (
    <div>
      <h3>{x.Username}</h3>
      <button onClick={()=>{AcceptFriendReq(x.uid);}}>Accept</button>
      <button onClick={()=>{AcceptFriendReq(x.uid);}}>Decline</button>
    </div>
  ));

  return (
    <div>
      <button onClick={() => SetFriendsPopup(!FriendsPopup)}>Friends</button>
      {FriendsPopup ? (
        <div className="FirendsPopUp">
          <h1>Friends</h1>
          <form onSubmit={onFriendSubmit}>
            <input
              type="text"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                SetFriendEmail(e.target.value)
              }
              value={FriendEmail}
            />
            <button>Add Friend</button>
          </form>
          {styledRequests}
        </div>
      ) : null}
    </div>
  );
}
