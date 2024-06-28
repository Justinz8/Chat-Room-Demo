import "./MessageCard.css";

export default function MessageCard(props: any) {
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
