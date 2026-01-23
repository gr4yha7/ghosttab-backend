import {
  supabase,
  logger,
  ForbiddenError,
} from '@ghosttab/common';

export interface ChainCurrency {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  [key: string]: any; // Add index signature for JSON compatibility
}

export class AdminService {
  private async checkAdmin(userId: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || user?.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can perform this action');
    }
  }

  async addChain(userId: string, data: {
    name: string;
    contractAddress: string;
    vaultAddress: string;
    autosettleSupported?: boolean;
    supportedCurrencies?: ChainCurrency[];
  }): Promise<any> {
    await this.checkAdmin(userId);

    const { data: chain, error } = await supabase
      .from('chains')
      .insert({
        name: data.name,
        contract_address: data.contractAddress,
        vault_address: data.vaultAddress,
        autosettle_supported: data.autosettleSupported || false,
        supported_currencies: data.supportedCurrencies as any || [],
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to add chain', { error });
      throw new Error('Failed to add chain');
    }

    logger.info('Chain added by admin', { adminId: userId, chainId: chain.id });
    return chain;
  }

  async updateChain(userId: string, chainId: string, updates: Partial<{
    name: string;
    contractAddress: string;
    vaultAddress: string;
    autosettleSupported: boolean;
    supportedCurrencies: ChainCurrency[];
  }>): Promise<any> {
    await this.checkAdmin(userId);

    const { data: chain, error } = await supabase
      .from('chains')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.contractAddress && { contract_address: updates.contractAddress }),
        ...(updates.vaultAddress && { vault_address: updates.vaultAddress }),
        ...(updates.autosettleSupported !== undefined && { autosettle_supported: updates.autosettleSupported }),
        ...(updates.supportedCurrencies && { supported_currencies: updates.supportedCurrencies as any }),
      })
      .eq('id', chainId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update chain', { chainId, error });
      throw new Error('Failed to update chain');
    }

    logger.info('Chain updated by admin', { adminId: userId, chainId });
    return chain;
  }

  async addSupportedCurrency(userId: string, chainId: string, currency: ChainCurrency): Promise<any> {
    await this.checkAdmin(userId);

    // Get current currencies
    const { data: chain, error: fetchError } = await supabase
      .from('chains')
      .select('supported_currencies')
      .eq('id', chainId)
      .single();

    if (fetchError || !chain) {
      throw new Error('Chain not found');
    }

    const currentCurrencies = (chain.supported_currencies as any as ChainCurrency[]) || [];
    const updatedCurrencies = [...currentCurrencies, currency];

    const { data: updatedChain, error: updateError } = await supabase
      .from('chains')
      .update({ supported_currencies: updatedCurrencies as any })
      .eq('id', chainId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to add currency to chain', { chainId, error: updateError });
      throw new Error('Failed to add currency');
    }

    logger.info('Currency added to chain by admin', { adminId: userId, chainId, currency: currency.symbol });
    return updatedChain;
  }
}

export const adminService = new AdminService();
