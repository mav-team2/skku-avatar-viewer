
import { protobufHandler, MessageType } from '../src/proto/ProtobufHandler';
import path from 'path';

async function testProtobuf() {
  try {
    // Initialize with absolute path to proto file for testing
    const protoPath = path.resolve(process.cwd(), 'src/proto/game.proto');
    await protobufHandler.initialize(protoPath);

    console.log('ProtobufHandler initialized');

    // Test AvatarCreate
    const createPayload = {
      id: 'test-avatar',
      x: 100,
      y: 200,
      name: 'TestUser',
      spriteUrl: 'http://example.com/sprite.png'
    };

    const encoded = protobufHandler.encode(MessageType.AVATAR_CREATE, createPayload);
    console.log('Encoded length:', encoded.length);

    const decoded = protobufHandler.decode(encoded);
    console.log('Decoded type:', decoded.type);
    console.log('Decoded payload:', decoded.payload);

    if (decoded.type === MessageType.AVATAR_CREATE && 
        (decoded.payload as any).id === createPayload.id) {
      console.log('SUCCESS: AvatarCreate test passed');
    } else {
      console.error('FAILURE: AvatarCreate test failed');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProtobuf();
