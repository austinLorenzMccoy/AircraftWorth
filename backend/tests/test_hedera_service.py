import os

import pytest

from services.hedera_service import HederaService


TEST_ENV = {
    "HEDERA_OPERATOR_ID": "0.0.1001",
    "HEDERA_OPERATOR_KEY": "302e020100300506032b6570042204200123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "HCS_TOPIC_ID": "0.0.5005",
    "SWT_TOKEN_ID": "0.0.9009",
}


@pytest.mark.asyncio
async def test_log_evaluation(mocker):
    mock_client = mocker.patch('services.hedera_service.Client')
    mock_tx = mocker.Mock()
    mock_receipt = mocker.Mock()
    mock_receipt.topic_sequence_number = 123
    mock_tx.get_receipt_async.return_value = mock_receipt
    mock_client.for_testnet.return_value = mock_client
    mocker.patch('services.hedera_service._account_id_from_string', side_effect=lambda v: v)
    mocker.patch('services.hedera_service._private_key_from_string', side_effect=lambda v: v)

    mocker.patch.dict(os.environ, TEST_ENV, clear=False)

    service = HederaService()
    result = await service.log_evaluation({"test": "data"})
    assert result == 123


@pytest.mark.asyncio
async def test_mint_skill_token(mocker):
    mock_client = mocker.patch('services.hedera_service.Client')
    mock_tx = mocker.Mock()
    mock_receipt = mocker.Mock()
    mock_receipt.token_id = "0.0.123"
    mock_tx.get_receipt_async.return_value = mock_receipt
    mock_client.for_testnet.return_value = mock_client
    mocker.patch('services.hedera_service._account_id_from_string', side_effect=lambda v: v)
    mocker.patch('services.hedera_service._private_key_from_string', side_effect=lambda v: v)

    mocker.patch.dict(os.environ, TEST_ENV, clear=False)

    service = HederaService()
    result = await service.mint_skill_token("0.0.7", 100)
    assert result == "0.0.123"
