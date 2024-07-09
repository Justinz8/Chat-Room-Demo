import "./MessageCard.css";

import { Message } from "../../interfaces";
interface props{
  message: Message,
  merge: boolean
}

export default function MessageCard(props: props) {

  function FormattedMessage(){
    const {timestamp, sender, message, added, type} = props.message;
    const formattedtimestamp = new Date(timestamp).toUTCString();
    const merge = props.merge;

    switch (type){
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
              <p className="MessageCard-Username">
                {sender.Username + " "}
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
