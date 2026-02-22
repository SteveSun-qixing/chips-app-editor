/**
 * 卡片命令测试
 * @module tests/unit/core/commands/card-commands
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCardStore } from '@/core/state';
import type { BaseCardInfo, Card } from '@/core/state/stores/card';
import {
  AddBaseCardCommand,
  RemoveBaseCardCommand,
  MoveBaseCardCommand,
  UpdateBaseCardConfigCommand,
  BatchCardCommand,
} from '@/core/commands/card-commands';

// 创建测试用的卡片数据
function createTestCard(id: string): Card {
  return {
    id,
    metadata: {
      chip_standards_version: '1.0.0',
      card_id: id,
      name: `Test Card ${id}`,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    },
    structure: {
      structure: [],
      manifest: {
        card_count: 0,
        resource_count: 0,
        resources: [],
      },
    },
  };
}

function createTestBaseCard(id: string): BaseCardInfo {
  return {
    id,
    type: 'text',
    config: { content: 'test content' },
  };
}

describe('AddBaseCardCommand', () => {
  let cardStore: ReturnType<typeof useCardStore>;
  const cardId = 'card-1';

  beforeEach(() => {
    setActivePinia(createPinia());
    cardStore = useCardStore();
    cardStore.addCard(createTestCard(cardId));
  });

  afterEach(() => {
    cardStore.clearAll();
  });

  it('should add base card on execute', async () => {
    const baseCard = createTestBaseCard('base-1');
    const command = new AddBaseCardCommand(cardId, baseCard);
    
    await command.execute();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure.length).toBe(1);
    expect(card?.structure[0]?.id).toBe('base-1');
  });

  it('should add base card at specific position', async () => {
    // Add two base cards first
    cardStore.addBaseCard(cardId, createTestBaseCard('existing-1'));
    cardStore.addBaseCard(cardId, createTestBaseCard('existing-2'));
    
    const newCard = createTestBaseCard('new-card');
    const command = new AddBaseCardCommand(cardId, newCard, 1);
    
    await command.execute();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure[1]?.id).toBe('new-card');
  });

  it('should remove base card on undo', async () => {
    const baseCard = createTestBaseCard('base-1');
    const command = new AddBaseCardCommand(cardId, baseCard);
    
    await command.execute();
    await command.undo();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure.length).toBe(0);
  });

  it('should re-add base card on redo', async () => {
    const baseCard = createTestBaseCard('base-1');
    const command = new AddBaseCardCommand(cardId, baseCard);
    
    await command.execute();
    await command.undo();
    await command.redo();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure.length).toBe(1);
  });

  it('should have correct description', () => {
    const command = new AddBaseCardCommand(cardId, createTestBaseCard('base-1'));
    expect(command.description).toBe('command.add_base_card');
  });
});

describe('RemoveBaseCardCommand', () => {
  let cardStore: ReturnType<typeof useCardStore>;
  const cardId = 'card-1';

  beforeEach(() => {
    setActivePinia(createPinia());
    cardStore = useCardStore();
    cardStore.addCard(createTestCard(cardId));
    cardStore.addBaseCard(cardId, createTestBaseCard('base-1'));
    cardStore.addBaseCard(cardId, createTestBaseCard('base-2'));
  });

  afterEach(() => {
    cardStore.clearAll();
  });

  it('should remove base card on execute', async () => {
    const command = new RemoveBaseCardCommand(cardId, 'base-1');
    
    await command.execute();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure.length).toBe(1);
    expect(card?.structure[0]?.id).toBe('base-2');
  });

  it('should restore base card on undo', async () => {
    const command = new RemoveBaseCardCommand(cardId, 'base-1');
    
    await command.execute();
    await command.undo();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure.length).toBe(2);
    expect(card?.structure[0]?.id).toBe('base-1');
  });

  it('should restore base card at original position', async () => {
    const command = new RemoveBaseCardCommand(cardId, 'base-1');
    
    await command.execute();
    await command.undo();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure[0]?.id).toBe('base-1');
    expect(card?.structure[1]?.id).toBe('base-2');
  });

  it('should remove base card again on redo', async () => {
    const command = new RemoveBaseCardCommand(cardId, 'base-1');
    
    await command.execute();
    await command.undo();
    await command.redo();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure.length).toBe(1);
  });

  it('should have correct description', () => {
    const command = new RemoveBaseCardCommand(cardId, 'base-1');
    expect(command.description).toBe('command.remove_base_card');
  });
});

describe('MoveBaseCardCommand', () => {
  let cardStore: ReturnType<typeof useCardStore>;
  const cardId = 'card-1';

  beforeEach(() => {
    setActivePinia(createPinia());
    cardStore = useCardStore();
    cardStore.addCard(createTestCard(cardId));
    cardStore.addBaseCard(cardId, createTestBaseCard('base-1'));
    cardStore.addBaseCard(cardId, createTestBaseCard('base-2'));
    cardStore.addBaseCard(cardId, createTestBaseCard('base-3'));
  });

  afterEach(() => {
    cardStore.clearAll();
  });

  it('should move base card on execute', async () => {
    const command = new MoveBaseCardCommand(cardId, 0, 2);
    
    await command.execute();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure[0]?.id).toBe('base-2');
    expect(card?.structure[1]?.id).toBe('base-3');
    expect(card?.structure[2]?.id).toBe('base-1');
  });

  it('should restore order on undo', async () => {
    const command = new MoveBaseCardCommand(cardId, 0, 2);
    
    await command.execute();
    await command.undo();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure[0]?.id).toBe('base-1');
    expect(card?.structure[1]?.id).toBe('base-2');
    expect(card?.structure[2]?.id).toBe('base-3');
  });

  it('should support merging with same card move', () => {
    const command1 = new MoveBaseCardCommand(cardId, 0, 1);
    const command2 = new MoveBaseCardCommand(cardId, 1, 2);
    
    expect(command2.canMergeWith!(command1)).toBe(true);
  });

  it('should not merge with different card move', () => {
    const command1 = new MoveBaseCardCommand('card-1', 0, 1);
    const command2 = new MoveBaseCardCommand('card-2', 0, 1);
    
    expect(command2.canMergeWith!(command1)).toBe(false);
  });

  it('should have correct description', () => {
    const command = new MoveBaseCardCommand(cardId, 0, 1);
    expect(command.description).toBe('command.move_base_card');
  });
});

describe('UpdateBaseCardConfigCommand', () => {
  let cardStore: ReturnType<typeof useCardStore>;
  const cardId = 'card-1';

  beforeEach(() => {
    setActivePinia(createPinia());
    cardStore = useCardStore();
    cardStore.addCard(createTestCard(cardId));
    cardStore.addBaseCard(cardId, {
      id: 'base-1',
      type: 'text',
      config: { content: 'original', fontSize: 14 },
    });
  });

  afterEach(() => {
    cardStore.clearAll();
  });

  it('should update config on execute', async () => {
    const command = new UpdateBaseCardConfigCommand(cardId, 'base-1', {
      content: 'updated',
    });
    
    await command.execute();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure[0]?.config?.content).toBe('updated');
    expect(card?.structure[0]?.config?.fontSize).toBe(14); // preserved
  });

  it('should restore config on undo', async () => {
    const command = new UpdateBaseCardConfigCommand(cardId, 'base-1', {
      content: 'updated',
    });
    
    await command.execute();
    await command.undo();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure[0]?.config?.content).toBe('original');
  });

  it('should re-apply config on redo', async () => {
    const command = new UpdateBaseCardConfigCommand(cardId, 'base-1', {
      content: 'updated',
    });
    
    await command.execute();
    await command.undo();
    await command.redo();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure[0]?.config?.content).toBe('updated');
  });

  it('should support merging with same base card update', () => {
    const command1 = new UpdateBaseCardConfigCommand(cardId, 'base-1', { x: 1 });
    const command2 = new UpdateBaseCardConfigCommand(cardId, 'base-1', { x: 2 });
    
    expect(command2.canMergeWith!(command1)).toBe(true);
  });

  it('should not merge with different base card update', () => {
    const command1 = new UpdateBaseCardConfigCommand(cardId, 'base-1', { x: 1 });
    const command2 = new UpdateBaseCardConfigCommand(cardId, 'base-2', { x: 2 });
    
    expect(command2.canMergeWith!(command1)).toBe(false);
  });

  it('should have correct description', () => {
    const command = new UpdateBaseCardConfigCommand(cardId, 'base-1', {});
    expect(command.description).toBe('command.update_base_card_config');
  });
});

describe('BatchCardCommand', () => {
  let cardStore: ReturnType<typeof useCardStore>;
  const cardId = 'card-1';

  beforeEach(() => {
    setActivePinia(createPinia());
    cardStore = useCardStore();
    cardStore.addCard(createTestCard(cardId));
  });

  afterEach(() => {
    cardStore.clearAll();
  });

  it('should execute all commands', async () => {
    const command = new BatchCardCommand([
      new AddBaseCardCommand(cardId, createTestBaseCard('base-1')),
      new AddBaseCardCommand(cardId, createTestBaseCard('base-2')),
    ]);
    
    await command.execute();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure.length).toBe(2);
  });

  it('should undo all commands in reverse order', async () => {
    const command = new BatchCardCommand([
      new AddBaseCardCommand(cardId, createTestBaseCard('base-1')),
      new AddBaseCardCommand(cardId, createTestBaseCard('base-2')),
    ]);
    
    await command.execute();
    await command.undo();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure.length).toBe(0);
  });

  it('should redo all commands', async () => {
    const command = new BatchCardCommand([
      new AddBaseCardCommand(cardId, createTestBaseCard('base-1')),
      new AddBaseCardCommand(cardId, createTestBaseCard('base-2')),
    ]);
    
    await command.execute();
    await command.undo();
    await command.redo();
    
    const card = cardStore.getCard(cardId);
    expect(card?.structure.length).toBe(2);
  });

  it('should use custom description', () => {
    const command = new BatchCardCommand([], 'command.custom_batch');
    expect(command.description).toBe('command.custom_batch');
  });

  it('should use default description', () => {
    const command = new BatchCardCommand([]);
    expect(command.description).toBe('command.batch_operation');
  });
});
