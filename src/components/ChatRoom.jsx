import  { useEffect, useState } from "react";
import { HubConnectionBuilder } from "@microsoft/signalr";

import { jwtDecode } from "jwt-decode";
import { AUTH_CONFIG } from "../config/env";
import "./ChatRoom.css"; // سننشئ ملف CSS مخصص
import { getAllUsers ,getPrivateMessages ,getGroups,getMassegesGroups ,createGroub,sendMessages,getGroupsUser} from "../services/api"; 
import { Layout,Modal, Menu,Checkbox,Button, List, Input, Typography, Divider } from "antd";
import { UserOutlined, TeamOutlined, MessageOutlined, PlusOutlined } from "@ant-design/icons";
import connection from "../services/signalR"
const ChatRoom = () => {
  const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Title } = Typography;
  const [connections, setConnection] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState(null);
  const [users, setUsers] = useState([]);
const [groups, setGroups] = useState([]);
const [selectedGroupId, setSelectedGroupId] = useState(null);
const [showCreateGroup, setShowCreateGroup] = useState(false);
const [newGroupName, setNewGroupName] = useState("");
const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const token = localStorage.getItem(AUTH_CONFIG.tokenKey || "accessToken");
  let userId = null;
  if (token) {
    const decoded = jwtDecode(token);
    userId = decoded.userId || decoded.nameid || decoded.sub;
  }


const joinGroup = async (groupId) => {
  if (connection) {
     await connection.invoke("JoinGroup", groupId.toString());
    setSelectedGroupId(groupId);
    setSelectedReceiverId(null); // لا نرسل لشخص معين

    // ✅ جلب رسائل المجموعة
    try {
      const groupMessages = await getMassegesGroups(groupId);
      const formatted = groupMessages.map((m) => ({
             senderName:m.senderName,       
             senderId: m.senderId,
             content: m.content,
             mine: m.senderId === userId,
             timestamp: m.timestamp,
           }));
      setMessages(formatted);
      cons
    } catch (error) {
      console.error("❌ فشل في جلب رسائل المجموعة:", error);
    }
  }
};
const handleCreateGroup = async () => {
  if (!newGroupName.trim() || selectedMemberIds.length === 0) {
    alert("يرجى إدخال اسم المجموعة واختيار الأعضاء");
    return;
  }

  try {
   const res = await createGroub(newGroupName, selectedMemberIds);
    // تأكد من أن createGroub ترجع كائن المجموعة المنشأة
    console.log(newGroupName)
    console.log(selectedMemberIds)
 
      const created = res;
      setGroups((prev) => [...prev, created]);
      setShowCreateGroup(false);
      setNewGroupName("");
      setSelectedMemberIds([]);
  } catch (err) {
    console.error("خطأ في إنشاء المجموعة:", err);
  }
};


  useEffect(() => {
    // const conn = new HubConnectionBuilder()
    //   .withUrl("https://localhost:7152/chatHub", {
    //     accessTokenFactory: () => token,
    //   })
    //   .withAutomaticReconnect()
    //   .build();

    connection
      .start()
      .then(() => {
        console.log("✅ Connected to SignalR hub");
        setConnection(connection);
      })
      .catch((err) => console.error("SignalR Connection Error: ", err));

    return () => {
      conn.stop();
    };
  }, [token]);

  useEffect(() => {
  const fetchUsers = async () => {
    try {
      const users = await getAllUsers();
      setUsers(users);
      console.log("Users state:", users);
    } catch (err) {
      console.error("❌ فشل في جلب المستخدمين:", err);
       console.log("❌ فشل في جلب المستخدمين:", err);
    }
  };

  fetchUsers();
}, []); 


useEffect(() => {
  const fetchGroups = async () => {
    try {
      
      // const data = await getGroups();
      const data = await getGroupsUser();
      setGroups(data);
    } catch (err) {
      console.error("❌ فشل في جلب المجموعات:", err);
    }
  };

  fetchGroups();
}, []);

useEffect(() => {
  const fetchMessages = async () => {
    if (!selectedReceiverId) return;

    try {
      const previousMessages = await getPrivateMessages(selectedReceiverId);
      const formatted = previousMessages.map((m) => ({
 senderName:m.senderName,       
             senderId: m.senderId,
                     content: m.content,
        mine: m.senderId === userId,
        timestamp: m.timestamp,
      }));
      setMessages(formatted);
    } catch (error) {
      console.error("❌ فشل في جلب الرسائل:", error);
      
    }
  };

  fetchMessages();
}, [selectedReceiverId]);

  useEffect(() => {
    if (!connections) return;

    const receiveMessageHandler = (senderId, content ,timestamp,senderName) => {
      setMessages((prev) => [
        ...prev,
        { senderId, senderName,content, mine: senderId === userId ,timestamp},
      ]);
      console.log("📩 Received message:", { senderId, content, timestamp, senderName });
    };

    connections.on("ReceiveMessage", receiveMessageHandler);
    connections.on("ReceivePrivateMessage", receiveMessageHandler);
    connections.on("ReceiveGroupMessage", receiveMessageHandler);

    return () => {
      connections.off("ReceiveMessage", receiveMessageHandler);
      connections.off("ReceivePrivateMessage", receiveMessageHandler);
      connections.off("ReceiveGroupMessage", receiveMessageHandler);
    };
  }, [connections, userId]);

  const sendMessage = async () => {
    if (message.trim() === "") return;

    try {
       await sendMessages(
        message,
        selectedGroupId ? null : selectedReceiverId,
        selectedGroupId ? parseInt(selectedGroupId) : null);

      setMessage("");
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

 return (
  <>
 <Layout style={{ height: "100vh" }}>
    <Sider width={250} style={{ background: "#fff", padding: "16px" }}>
      <Title level={4}>📁 المجموعات</Title>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setShowCreateGroup(true)}
        block
        style={{ marginBottom: "12px" }}
      >
        إنشاء مجموعة
      </Button>

      <Menu
  mode="inline"
  selectedKeys={[selectedGroupId?.toString()]}
  onClick={({ key }) => joinGroup(key)}
  items={groups.map((group) => ({
    key: group.id.toString(),
    icon: <TeamOutlined />,
    label: group.name,
  }))}
/>

      <Divider></Divider>
      <Title level={4}>👥 المستخدمين</Title>
    <Menu
  mode="inline"
  selectedKeys={[selectedReceiverId?.toString()]}
  onClick={({ key }) => {
    setSelectedReceiverId(key);
    setSelectedGroupId(null);
  }}
  items={users
    .filter((u) => u.id !== userId)
    .map((user) => ({
      key: user.id.toString(),
      icon: <UserOutlined />,
      label: user.email,
    }))}
/>
    </Sider>

    <Layout>
      <Content style={{ padding: "16px", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px", background: "#fafafa", borderRadius: "8px" }}>
          <List
            dataSource={messages}
            renderItem={(msg) => (
              <List.Item
                style={{
                  justifyContent: msg.mine ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    background: msg.mine ? "#1890ff" : "#f0f0f0",
                    color: msg.mine ? "#fff" : "#000",
                    padding: "8px 12px",
                    borderRadius: "16px",
                    maxWidth: "70%",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                    {msg.mine ? "أنا" : msg.senderName}
                  </div>
                  <div>{msg.content}</div>
                  <div style={{ fontSize: "0.75rem", textAlign: "right", marginTop: 4 }}>
                    {new Date(msg.timestamp).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>

        <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
          <TextArea
            rows={1}
            placeholder="اكتب رسالة..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onPressEnter={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            style={{ resize: "none" }}
          />
          <Button type="primary" icon={<MessageOutlined />} onClick={sendMessage}>
            إرسال
          </Button>
        </div>
      </Content>
    </Layout>
  </Layout>
  
  <Modal
  title="إنشاء مجموعة جديدة"
  open={showCreateGroup}
  onCancel={() => setShowCreateGroup(false)}
  onOk={handleCreateGroup}
  okText="إنشاء"
  cancelText="إلغاء"
>
  <label>اسم المجموعة:</label>
  <Input
    placeholder="أدخل اسم المجموعة"
    value={newGroupName}
    onChange={(e) => setNewGroupName(e.target.value)}
  />

  <div style={{ marginTop: 16 }}>
    <label>اختر الأعضاء:</label>
    <Checkbox.Group
      style={{ display: "flex", flexDirection: "column", marginTop: 8, maxHeight: 200, overflowY: "auto" }}
      value={selectedMemberIds}
      onChange={(checkedValues) => setSelectedMemberIds(checkedValues)}
    >
      {users
        .filter((u) => u.id !== userId)
        .map((user) => (
          <Checkbox key={user.id} value={user.id}>
            {user.email}
          </Checkbox>
        ))}
    </Checkbox.Group>
  </div>
</Modal>
    </>
);
};

export default ChatRoom;