import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ChannelChatBox from '../components/ChannelChatBox';
import useAuthStore from '../store/authStore';
import ChannelSidebar from '../components/ChannelSidebar';

const ChannelChatPage = () => {
  const { id: workspaceId, channelId } = useParams();
  const { token } = useAuthStore();
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    const fetchChannelInfo = async () => {
      try {
        const res = await axios.get(
            `http://localhost:5050/api/workspaces/${workspaceId}/channels/${channelId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setChannel(res.data);
      } catch (err) {
        console.error('Erreur chargement canal :', err);
      }
    };

    if (workspaceId && channelId && token) {
      fetchChannelInfo();
    }
  }, [workspaceId, channelId, token]);

  if (!channel) {
    return (
        <div className="flex justify-center items-center w-full h-full text-gray-600 dark:text-white">
          Chargement du canal...
        </div>
    );
  }

  return (
      <div className="l h-full grid grid-cols-12 ml-[70px]">
        <div className="col-span-3 h-full">
            <ChannelSidebar activeChannelId={channelId} />
        </div>
        <div className="col-span-9 h-full">
          <ChannelChatBox
              channelId={channelId}
              channelName={channel.name}
              workspaceId={workspaceId}
          />
        </div>
      </div>
  );
};

export default ChannelChatPage;
