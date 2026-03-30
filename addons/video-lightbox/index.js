import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import save from './save';
import metadata from './block.json';
import './style-index.css';
import './index.css';

registerBlockType( metadata.name, {
	edit: Edit,
	save,
} );
