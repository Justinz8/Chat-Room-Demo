import "./Friends.css";
import React, { useState } from "react";

export default function PopupFriends(props: any) {
  const [FriendsPopup, SetFriendsPopup] = useState(false);

  const [FriendEmail, SetFriendEmail] = useState("");

  function onFriendSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    props.addFriend(FriendEmail);
  }

  console.log(props.FriendRequests);

  const styledRequests = props.FriendRequests.map((x: any) => (
    <div>
      <h3>{x.Username}</h3>
      <button>Accept</button>
      <button>Decline</button>
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
