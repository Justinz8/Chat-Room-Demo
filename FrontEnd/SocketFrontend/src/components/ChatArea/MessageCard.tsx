import "./MessageCard.css";

interface props{
  uid: string,
  message: string,
  time: string,
  merge: boolean
}

export default function MessageCard(props: props) {
  return (
    <div className="MessageCard-Body">
      {!props.merge && (
        <p className="MessageCard-Username">
          {props.uid + " "}
          <span className="MessageCard-TimeText">{props.time}</span>
        </p>
      )}
      <p className="MessageCard-Message">{props.message}</p>
    </div>
  );
}
