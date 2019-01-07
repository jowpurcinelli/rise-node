import { address, publicKey } from '@risevision/core-types';
import { IBaseModel } from './IBaseModel';

export class IAccountsModel extends IBaseModel<IAccountsModel> {
  // public static searchDelegate(q: string, limit: number, orderBy: string, orderHow: 'ASC' | 'DESC' = 'ASC'): string {
  //   throw new Error('NotImplementedException');
  // }

  public static createBulkAccountsSQL(addresses: address[]): string {
    throw new Error('NotImplementedException');
  }

  public static restoreUnconfirmedEntries(): Promise<void> {
    throw new Error('NotImplementedException');
  }
  public address: string;
  public balance: bigint;
  public virgin: 0 | 1;
  // tslint:disable-next-line
  public u_balance: bigint;

  // public isMultisignature(): boolean {
  //   return null;
  // };

  public toPOJO(): { [k: string]: string | number } {
    return null;
  }

  public applyDiffArray(
    toWhat: // tslint:disable-next-line
    'delegates' | 'u_delegates' | 'multisignatures' | 'u_multisignatures',
    diff: any
  ) {
    return null;
  }

  public applyValues(items: Partial<this>) {
    return null;
  }
}
