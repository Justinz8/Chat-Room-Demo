import "./MessageCard.css";

import { User } from "../../interfaces";
interface props{
  sender: User,
  message: string,
  time: string,
  merge: boolean
}

export default function MessageCard(props: props) {
  console.log(props)
  return (
    <div className="MessageCard-Body">
      {!props.merge && (
        <p className="MessageCard-Username">
          {props.sender.Username + " "}
          <span className="MessageCard-TimeText">{props.time}</span>
        </p>
      )}
      <p className="MessageCard-Message">{props.message}</p>
    </div>
  );
}
