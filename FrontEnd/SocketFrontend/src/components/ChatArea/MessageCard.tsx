import "./MessageCard.css";

import Popup from 'reactjs-popup';
import UserActionPopup from "../Popup/UserActionPopup";

import { Message } from "../../interfaces";
interface props{
  message: Message,
  merge: boolean
}

export default function MessageCard(props: props) {

  function FormattedMessage(){
    const {timestamp, sender, message, added, removed, type} = props.message;
    const formattedtimestamp = new Date(timestamp).toLocaleString();
    const merge = props.merge;

    switch (type){
      case -2:{
        return (
          <>
            <p>{`${sender.Username} left the chat at ${formattedtimestamp}`}</p>
          </>
        )
      }
      case -1:{
        return (
          <>
            <p>{`${sender.Username} removed ${removed?.Username} at ${formattedtimestamp}`}</p>
          </>
        )
      }
      case 0: {
        return (
          <>
            <p>{`${sender.Username} added ${added?.Username} at ${formattedtimestamp}`}</p>
          </>
        )
      }
      case 1:{
        return (
          <>
            {!merge && (
              <p className="MessageCard-Title">
                <Popup 
                  trigger={
                    <span className="MessageCard-Username">
                      {sender.Username + " "}
                    </span>
                  }
                  position={['right top', 'right bottom']}
                  keepTooltipInside='.ChatWindow-Content'>
                  <UserActionPopup uid={sender.uid} chatOptions={true}/>
                </Popup>
                
                <span className="MessageCard-TimeText">{formattedtimestamp}</span>
              </p>
            )}
            <p className="MessageCard-Message">{message}</p>
          </>
        )
      }
    }

  }

  return (
    <div className="MessageCard-Body">
      {FormattedMessage()}
    </div>
  );
}
