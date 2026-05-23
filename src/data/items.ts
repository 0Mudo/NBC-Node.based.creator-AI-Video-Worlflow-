export interface Item {
  id: string
  name: string
  nameEn: string
  description: string
  material: string
  status: string
  tags: string[]
  refImage?: string
}

export const items: Item[] = []
