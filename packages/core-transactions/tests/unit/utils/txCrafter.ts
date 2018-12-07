import { ITransportTransaction } from '@risevision/core-types';
import { IBaseTransaction } from '@risevision/core-types';
import { dposOffline } from 'dpos-offline';
import { LiskWallet } from 'dpos-offline/dist/es5/liskWallet';
import { ITransaction } from 'dpos-offline/src/trxTypes/BaseTx';
import * as uuid from 'uuid';
// import { generateAccount } from './accountsUtils';
// tslint:disable object-literal-sort-keys
export const toBufferedTransaction = <T>(
  t: ITransaction<any>
): IBaseTransaction<T, bigint> & { senderId: string } => {
  return {
    ...t,
    senderPublicKey: Buffer.from(t.senderPublicKey, 'hex'),
    // signSignature:
    //   t.signSignature === null || typeof t.signSignature === 'undefined'
    //     ? null
    //     : Buffer.from(t.signSignature, 'hex'),
    signature: Buffer.from(t.signature, 'hex'),
    signatures: t.signatures
      ? t.signatures.map((s) => Buffer.from(s, 'hex'))
      : undefined,
    amount: BigInt(t.amount),
    fee: BigInt(t.fee),
  };
};

export const fromBufferedTransaction = <T>(
  t: IBaseTransaction<T>
): ITransaction<any> & { blockId?: string } => {
  return {
    ...t,
    amount: parseInt(`${t.amount}`, 10),
    fee: parseInt(`${t.fee}`, 10),
    senderPublicKey: t.senderPublicKey.toString('hex'),
    requesterPublicKey: null,
    // signSignature:
    //   t.signSignature === null || typeof t.signSignature === 'undefined'
    //     ? null
    //     : t.signSignature.toString('hex'),
    signature: t.signature.toString('hex'),
    senderId: t.senderId,
    asset: t.asset,
    signatures: t.signatures
      ? t.signatures.map((s) => s.toString('hex'))
      : null,
  };
};

export const createRandomTransaction = (
  wallet: LiskWallet = new LiskWallet(uuid.v4(), 'R')
): ITransaction => {
  return createSendTransaction(
    wallet,
    new LiskWallet(uuid.v4(), 'R').address,
    10000000,
    { amount: Date.now() % 100000 }
  );
};
export const createRandomTransactions = (howMany: number): ITransaction[] => {
  return new Array(howMany).fill(null).map(() => createRandomTransaction());
};

export const createSendTransaction = (
  from: LiskWallet,
  recipient: string,
  fee: number | bigint,
  obj: any = {}
): ITransaction => {
  const t = new dposOffline.transactions.SendTx().withTimestamp(0);
  Object.keys(obj).forEach((k) => t.set(k as any, obj[k]));
  return from.signTransaction(
    t.withFees(parseInt(fee.toString(), 10)).withRecipientId(recipient)
  );
};

//

//