export default function ChatCard(props: any) {
  return (
    <button
      key={props.id}
      className="ChatCard-Wrapper"
      onClick={() => {
        props.setCurrentChat(props.chatID);
      }}
    >
      <h1 className="ChatCard-Name">{props.name}</h1>
      <p className="ChatCard-Members">
        {props.members.map((x: any) => x.name).toString()}
      </p>
    </button>
  );
}
