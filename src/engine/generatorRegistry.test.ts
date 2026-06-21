import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGenerateBananaImage = vi.fn()

vi.mock('@/engine/promptResolver', () => ({
  resolveImageRefs: (refs: string[]) => refs,
  convertRefToDataUri: async (ref: string) => ref,
}))

vi.mock('@/api/gptImage2', () => ({
  generateGPTImageStream: vi.fn(),
}))

vi.mock('@/api/seedance', () => ({
  submitSeedanceTask: vi.fn(),
  pollSeedanceTask: vi.fn(),
}))

vi.mock('@/api/banana', () => ({
  generateBananaImage: (...args: unknown[]) => mockGenerateBananaImage(...args),
}))

vi.mock('@/store/useProviderStore', () => ({
  useProviderStore: {
    getState: () => ({
      getEnabledProviders: () => [
        {
          id: 'gptImage2',
          enabled: true,
          capabilities: ['text-to-image'],
          endpoints: [
            {
              id: 'default',
              url: 'https://grsai.dakka.com.cn/v1/api/generate',
              apiKey: 'gpt-key',
              isDefault: true,
            },
          ],
        },
        {
          id: 'banana',
          enabled: true,
          capabilities: ['text-to-image'],
          endpoints: [
            {
              id: 'default',
              url: 'https://grsai.dakka.com.cn/v1/api/generate',
              apiKey: 'banana-key',
              isDefault: true,
            },
          ],
        },
      ],
      getProvider: (id: string) => {
        if (id === 'gptImage2') {
          return {
            id,
            enabled: true,
            capabilities: ['text-to-image'],
            endpoints: [
              {
                id: 'default',
                url: 'https://grsai.dakka.com.cn/v1/api/generate',
                apiKey: 'gpt-key',
                isDefault: true,
              },
            ],
          }
        }

        if (id === 'banana') {
          return {
            id,
            enabled: true,
            capabilities: ['text-to-image'],
            endpoints: [
              {
                id: 'default',
                url: 'https://grsai.dakka.com.cn/v1/api/generate',
                apiKey: 'banana-key',
                isDefault: true,
              },
            ],
          }
        }

        return undefined
      },
    }),
  },
}))

describe('generatorRegistry', () => {
  beforeEach(() => {
    mockGenerateBananaImage.mockReset()
    mockGenerateBananaImage.mockResolvedValue({
      id: 'task-1',
      status: 'succeeded',
      progress: 100,
      results: [{ url: 'https://example.com/result.png' }],
    })
  })

  it('uses banana provider for banana adapter even when another text-to-image provider has an api key', async () => {
    const { generatorRegistry } = await import('./generatorRegistry')
    const adapter = generatorRegistry.get('banana')

    expect(adapter).toBeDefined()

    await adapter!.execute(
      {
        type: 'banana',
        data: {
          bananaModel: 'nano-banana-pro',
          bananaAspectRatio: '1:1',
          bananaImageSize: '1K',
        },
      } as any,
      'test prompt',
      [],
      undefined
    )

    expect(mockGenerateBananaImage).toHaveBeenCalledTimes(1)
    expect(mockGenerateBananaImage).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://grsai.dakka.com.cn/v1/api/generate',
        apiKey: 'banana-key',
      }),
      expect.any(Function),
      undefined
    )
  })
})
