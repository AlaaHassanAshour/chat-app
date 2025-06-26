import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("https://localhost:7152/chatHub", {
    accessTokenFactory: () => localStorage.getItem("token"),
  })
  .withAutomaticReconnect()
  .build();

export default connection;