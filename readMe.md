# Skill Token DApp

The Skill Token DApp is a decentralized application built on the Aptos blockchain that allows users to mint, transfer, and endorse skill-based tokens. This project demonstrates the use of Move smart contracts and a TypeScript-based frontend with integration to the Petra wallet.

## Features

- Mint new skill tokens with customizable skill name and level
- Transfer skill tokens to other addresses
- Endorse skill tokens owned by other users
- Track token creation, update, and endorsement timestamps
- View a list of all skill tokens owned by the connected wallet
- Responsive and modern user interface built with Next.js and Tailwind CSS

## Prerequisites

- [Aptos CLI](https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli) installed
- [Petra Wallet](https://petra.app/) extension installed in your browser
- Node.js and npm installed on your development machine

## Setup

1. Create a new directory for your project:

   ```bash
   mkdir skill-token-project
   cd skill-token-project
   ```

2. Set up a Python virtual environment (optional, but recommended):

   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. Install the Aptos CLI in the virtual environment:

   ```bash
   curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
   ```

4. Initialize your Aptos account:

   ```bash
   aptos init --network devnet
   ```

   This will create a `.aptos/config.yaml` file with your account information.

5. Create the project structure:

   ```bash
   mkdir -p sources
   touch Move.toml
   ```

6. Copy the `skill_token.move` file to the `sources` directory.

7. Compile the Move contract:

   ```bash
   aptos move compile
   ```

8. Deploy the contract:

   ```bash
   aptos move publish --named-addresses skill_token=default
   ```

9. Note the deployed contract address, which will be used in the frontend configuration.

10. Create a new Next.js project for the frontend:

    ```bash
    npx create-next-app@latest skill-token-frontend --typescript --tailwind
    cd skill-token-frontend
    ```

11. Install the required dependencies:

    ```bash
    npm install @aptos-labs/ts-sdk
    ```

12. Create a `.env.local` file in the `skill-token-frontend` directory with the following content:

    ```
    NEXT_PUBLIC_MODULE_ADDRESS="your_deployed_contract_address"
    NEXT_PUBLIC_NETWORK="devnet"
    ```

13. Start the development server:

    ```bash
    npm run dev
    ```

The application should now be running at `http://localhost:3000`.

## Usage

1. Connect your Petra wallet by clicking the "Connect Wallet" button.
2. Mint a new skill token by filling in the "Mint New Skill Token" form and clicking the "Mint Skill Token" button.
3. View the list of your owned skill tokens on the homepage.
4. Endorse other users' skill tokens by clicking the "Endorse" button on the token card.
5. Transfer a token to another address by clicking the "Transfer" button on the token card and entering the recipient's address.

## Testing

To test the Move contract:

```bash
aptos move test
```

To test the frontend:

1. Connect your Petra wallet and verify the connection status.
2. Mint a new skill token and verify it appears in the UI.
3. Endorse a token and verify the endorsement count is updated.
4. Transfer a token to another address and verify the token is removed from your list.

## Deployment

For deployment, you can use the provided `deploy.sh` script in the root directory of the project. This script will:

1. Compile the Move contract
2. Run the tests (if any)
3. Publish the contract to the Aptos network
4. Save the deployed contract address to the `.env.local` file in the frontend project

To use the script, make it executable and run it:

```bash
chmod +x deploy.sh
./deploy.sh
```

## Troubleshooting

- If you encounter issues with the Aptos CLI, try running `aptos node ping --network devnet` to check the network connection.
- If you have trouble with the virtual environment, make sure you have activated it correctly.
- If you face any other problems, refer to the Aptos documentation or reach out to the community for support.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please create a new issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
