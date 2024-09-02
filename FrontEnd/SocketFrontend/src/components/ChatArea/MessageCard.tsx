import "./MessageCard.css";

import Popup from "reactjs-popup";
import UserActionPopup from "../Popup/UserActionPopup";

import { Message } from "../../interfaces";

import { useLoadedUserGetter } from "../../CustomHooks";

import { useEffect, useState } from "react";

interface props {
    message: Message;
    merge: boolean;
}

export default function MessageCard(props: props) {
    const { getLoadedUser } = useLoadedUserGetter();
    const [PFP, SetPFP] = useState("");

    useEffect(() => {
        getLoadedUser(props.message.sender.uid).then((LoadedUser) => {
            SetPFP(LoadedUser.UserPFP);
        });
    }, []);

    function FormattedMessage() {
        const { timestamp, sender, message, added, removed, newOwner, type } =
            props.message;
        const formattedtimestamp = new Date(timestamp).toLocaleString();
        const merge = props.merge;
        //style the message based off the type of message
        switch (type) {
            case -2: {
                return (
                    <>
                        <p className="MessageCard-Message">{`${sender.Username} left the chat at ${formattedtimestamp}`}</p>
                    </>
                );
            }
            case -1: {
                return (
                    <>
                        <p className="MessageCard-Message">{`${sender.Username} removed ${removed?.Username} at ${formattedtimestamp}`}</p>
                    </>
                );
            }
            case 0: {
                return (
                    <>
                        <p className="MessageCard-Message">{`${sender.Username} added ${added?.Username} at ${formattedtimestamp}`}</p>
                    </>
                );
            }
            case 1: {
                return (
                    <>
                        {!merge && (
                            <p className="MessageCard-Title">
                                <Popup
                                    trigger={
                                        <img
                                            className="MessageCard-PFP"
                                            src={PFP}
                                            onError={(ev) => {
                                                ev.currentTarget.src =
                                                    "https://picsum.photos/50";
                                            }}
                                        ></img>
                                    }
                                    position={["right top", "right bottom"]}
                                    keepTooltipInside=".ChatWindow-Content"
                                >
                                    <UserActionPopup
                                        uid={sender.uid}
                                        chatOptions={true}
                                    />
                                </Popup>
                                <Popup
                                    trigger={
                                        <span className="MessageCard-Username">
                                            {sender.Username + " "}
                                        </span>
                                    }
                                    position={["right top", "right bottom"]}
                                    keepTooltipInside=".ChatWindow-Content"
                                >
                                    <UserActionPopup
                                        uid={sender.uid}
                                        chatOptions={true}
                                    />
                                </Popup>

                                <span className="MessageCard-TimeText">
                                    {formattedtimestamp}
                                </span>
                            </p>
                        )}
                        <p className="MessageCard-Message">{message}</p>
                    </>
                );
            }
            case 2: {
                return (
                    <p className="MessageCard-Message">
                        {sender.Username} made {newOwner?.Username} the owner
                    </p>
                );
            }

            case 3: {
                return (
                    <p className="MessageCard-Message">
                        {sender.Username} changed the chat name to {message}
                    </p>
                );
            }
        }
    }

    return <div className="MessageCard-Body">{FormattedMessage()}</div>;
}
